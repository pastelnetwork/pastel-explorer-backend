import { Connection, getConnection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import addressEventService from '../../services/address-events.service';
import blockService from '../../services/block.service';
import nftService from '../../services/nft.service';
import senseRequestsService from '../../services/senserequests.service';
import ticketService from '../../services/ticket.service';
import transactionService, {
  TTransactionWithoutOutgoingProps,
} from '../../services/transaction.service';
import { writeLog } from '../../utils/log';
import { createTopBalanceRank } from './create-top-rank';
import { batchCreateAddressEvents } from './db-utils';
import { getBlocks } from './get-blocks';
import { getAddressEvents } from './mappers';
import { updateAddress } from './update-address';
import {
  BatchAddressEvents,
  saveTransactionsAndAddressEvents,
  saveUnconfirmedTransactions,
} from './update-database';
import { updateMasternodeList } from './update-masternode-list';
import { updateTickets } from './updated-ticket';

export const updateBlockAndTransaction = async (
  blockNumber: number,
  connection: Connection = null,
): Promise<void> => {
  try {
    const blockHash = await rpcClient.command<BlockData[]>([
      {
        method: 'getblockhash',
        parameters: [blockNumber],
      },
    ]);

    if (blockHash[0]) {
      const block = await rpcClient.command<BlockData[]>([
        {
          method: 'getblock',
          parameters: [blockHash[0]],
        },
      ]);
      if (block[0]) {
        const txIds = block[0].tx;
        const currentBlock = await blockService.getOneByIdOrHeight(
          blockNumber.toString(),
        );

        const savedUnconfirmedTransactions =
          await transactionService.getAllByBlockHash(null);
        const batchSize = 1;
        const { rawTransactions, vinTransactions, unconfirmedTransactions } =
          await getBlocks(blockNumber, batchSize, savedUnconfirmedTransactions);
        const transactions = block[0].tx.map(t =>
          rawTransactions.find(tr => tr.txid === t),
        );

        const batchAddressEvents = rawTransactions.reduce<BatchAddressEvents>(
          (acc, transaction) => [
            ...acc,
            ...getAddressEvents(transaction, vinTransactions),
          ],
          [],
        );
        await blockService.updateBlockHash(
          block[0].hash,
          blockNumber,
          currentBlock.id,
          {
            timestamp: block[0].time,
            confirmations: block[0].confirmations,
            difficulty: block[0].difficulty,
            merkleRoot: block[0].merkleroot,
            nonce: block[0].nonce,
            solution: block[0].solution,
            size: block[0].size,
            transactionCount: transactions.length,
          },
          transactions,
          batchAddressEvents,
          txIds,
        );
        const currentTransactions =
          await transactionService.getTransactionByIds(txIds);
        const currentTxIds = [];
        for (const t of currentTransactions) {
          if (txIds.indexOf(t.id) === -1) {
            await transactionService.updateBlockHashNullByTxId(t.id);
          } else {
            currentTxIds.push(t.id);
          }
        }
        const newRawTransactions = [];
        const newVinTransactions = [];
        const newUnconfirmedTransactions = [];
        for (const t of rawTransactions) {
          if (currentTxIds.indexOf(t.txid) === -1) {
            newRawTransactions.push(t);
          }
        }
        for (const t of vinTransactions) {
          if (currentTxIds.indexOf(t.txid) === -1) {
            newVinTransactions.push(t);
          }
        }
        for (const t of unconfirmedTransactions) {
          if (currentTxIds.indexOf(t.txid) === -1) {
            newUnconfirmedTransactions.push(t);
          }
        }
        if (newUnconfirmedTransactions.length) {
          await saveUnconfirmedTransactions(
            connection || getConnection(),
            newUnconfirmedTransactions,
            newVinTransactions,
          );
        }
        if (newRawTransactions.length) {
          const newBatchAddressEvents =
            newRawTransactions.reduce<BatchAddressEvents>(
              (acc, transaction) => [
                ...acc,
                ...getAddressEvents(transaction, newVinTransactions),
              ],
              [],
            );
          await saveTransactionsAndAddressEvents(
            connection || getConnection(),
            newRawTransactions,
            newVinTransactions,
            newBatchAddressEvents,
          );
        }

        const newTransactions = await transactionService.getAllByBlockHash(
          block[0].hash,
        );
        if (newTransactions.length) {
          updateAddressEvents(connection || getConnection(), newTransactions);
        }
        await blockService.updateTotalTicketsForBlock([], blockNumber);
        await updateTickets(connection, block[0].tx, blockNumber);

        await updateMasternodeList(connection);
        await createTopBalanceRank(connection);
      }
    }
  } catch (error) {
    writeLog(`Error update block: ${blockNumber} >> ${JSON.stringify(error)}`);
  }
};

export async function updateNextBlockHashes(): Promise<void> {
  await blockService.updateNextBlockHashes();
}

export async function updateBlockHash(
  blockNumber: number,
  previousBlockHash: string,
  connection: Connection = null,
): Promise<void> {
  if (!blockNumber) {
    return;
  }
  try {
    const currentBlock = await blockService.getOneByIdOrHeight(
      blockNumber.toString(),
    );

    if (currentBlock.id !== previousBlockHash) {
      await updateBlockAndTransaction(blockNumber, connection);
    }
  } catch (error) {
    writeLog(
      `Error updateBlockHash: ${blockNumber} >> ${JSON.stringify(error)}`,
    );
  }
}

export async function updateUnCorrectBlock(): Promise<void> {
  const blocks = await blockService.getBlockHeightUnCorrect();
  for (const block of blocks) {
    await updateBlockAndTransaction(block.height);
  }
}

async function saveAddress(connection, batchAddressEventsChunks) {
  for (let i = 0; i < batchAddressEventsChunks.length; i++) {
    const items = batchAddressEventsChunks[i];
    for (let i = 0; i < items.length; i++) {
      await updateAddress(connection, items[i].address);
    }
  }
}

export async function updateAddressEvents(
  connection: Connection = null,
  transactions: TTransactionWithoutOutgoingProps[],
): Promise<void> {
  if (transactions.length) {
    for (const tran of transactions) {
      const txIds = await rpcClient.command([
        {
          method: 'getrawtransaction',
          parameters: [tran.id, 1],
        },
      ]);
      if (txIds[0]) {
        const incomingAddress = [];
        const outgoingAddress = [];
        const vin = txIds[0].vin || [];
        const vout = txIds[0].vout || [];
        for (const out of vout) {
          if (out) {
            incomingAddress.push({
              address: out?.scriptPubKey?.addresses?.[0],
              amount: out?.value,
              timestamp: txIds[0].time,
              transactionHash: tran.id,
              direction: 'Incoming',
            });
          }
        }
        for (const vi of vin) {
          try {
            const txInfo = await rpcClient.command([
              {
                method: 'getrawtransaction',
                parameters: [vi.txid, 1],
              },
            ]);

            if (txInfo[0]) {
              if (txInfo[0]?.vout?.[vi.vout]) {
                outgoingAddress.push({
                  address:
                    txInfo[0].vout[vi.vout]?.scriptPubKey?.addresses?.[0],
                  amount: -1 * txInfo[0].vout[vi.vout]?.value,
                  timestamp: txIds[0].time,
                  transactionHash: tran.id,
                  direction: 'Outgoing',
                });
              }
            }
          } catch (err) {
            console.log('updateAddressEvents error', err);
          }
        }

        const addressEvents =
          await addressEventService.findAllByTransactionHash(tran.id);
        const batchAddressEventsChunks = [
          ...outgoingAddress,
          ...incomingAddress,
        ];
        const newBatchAddressEvents = [];
        if (batchAddressEventsChunks.length) {
          const addresses = batchAddressEventsChunks.map(e => e.address);
          await addressEventService.deleteEventAndAddressNotInTransaction(
            tran.id,
            addresses,
          );
        }

        for (const address of batchAddressEventsChunks) {
          const existAddress = addressEvents.find(
            a => a.address === address.address,
          );
          if (
            !existAddress &&
            address.address &&
            address.amount &&
            address.timestamp &&
            address.transactionHash
          ) {
            newBatchAddressEvents.push(address);
          }

          if (
            existAddress &&
            address.direction === 'Outgoing' &&
            existAddress?.amount > 0
          ) {
            await addressEventService.updateAmount(
              address.amount,
              address.direction,
              address.address,
              txIds[0].txid,
            );
          }
        }
        if (newBatchAddressEvents.length) {
          const step = 15;
          for (let i = 0; i < newBatchAddressEvents.length; i += step) {
            await batchCreateAddressEvents(
              connection,
              newBatchAddressEvents.slice(i, i + step),
            );
          }
        }
        saveAddress(connection, batchAddressEventsChunks);
      }
    }
  }
}

export async function deleteReorgBlock(
  blockHeight: number,
  lastSavedBlockNumber: number,
): Promise<void> {
  for (let j = blockHeight; j <= lastSavedBlockNumber; j++) {
    const block = await blockService.getOneByIdOrHeight(j.toString());
    if (block.id) {
      const transactions = await transactionService.getAllIdByBlockHeight(
        Number(block.height),
      );
      const txIds = transactions.map(t => t.id);
      await addressEventService.deleteAllByTxIds(txIds);
      await ticketService.deleteTicketByBlockHeight(Number(block.height));
      await senseRequestsService.deleteTicketByBlockHeight(
        Number(block.height),
      );
      await nftService.deleteByBlockHeight(Number(block.height));
      await transactionService.deleteTransactionByBlockHash(block.height);
      await blockService.deleteBlockByHash(block.id);
    }
  }
}

async function getUnconfirmedTransactions(
  savedUnconfirmedTransactions: Array<{ id: string; height: number | null; }>,
) {
  const [unconfirmedTransactionsIdx] = await rpcClient.command<
    Array<
      Record<
        string,
        { time: number; size: number; fee: number; height: number; }
      >
    >
  >([
    {
      method: 'getrawmempool',
      parameters: [true],
    },
  ]);
  const getUnconfirmedTransactionsCommand = Object.keys(
    unconfirmedTransactionsIdx,
  )
    .filter(tx => !savedUnconfirmedTransactions.find(t => t.id === tx))
    .map(t => ({
      method: 'getrawtransaction',
      parameters: [t, 1],
    }))
    .flat();
  return (
    await rpcClient.command<TransactionData[]>(
      getUnconfirmedTransactionsCommand,
    )
  ).map(v => ({
    ...v,
    time: unconfirmedTransactionsIdx[v.txid].time,
    size: unconfirmedTransactionsIdx[v.txid].size,
    fee: unconfirmedTransactionsIdx[v.txid].fee,
    height: unconfirmedTransactionsIdx[v.txid].height,
    blockhash: null,
  }));
}

let isUpdating = false;
export async function validateMempoolTransaction(): Promise<void> {
  if (isUpdating) {
    return;
  }
  isUpdating = true;
  try {
    const lastBlockInfo = await blockService.getLastBlockInfo();
    const startingBlockNumber = Number(lastBlockInfo.height);
    const savedUnconfirmedTransactions =
      await transactionService.getUnConfirmTransactionsByBlockHeight(
        startingBlockNumber - 10,
      );
    if (savedUnconfirmedTransactions.length) {
      const unconfirmedTransactions = await getUnconfirmedTransactions(
        savedUnconfirmedTransactions,
      );
      const unconfirmedTransactionsTxId = Object.keys(unconfirmedTransactions);
      const transactions = savedUnconfirmedTransactions.filter(
        t => !unconfirmedTransactionsTxId.includes(t.id),
      );
      for (let i = 0; i < transactions.length; i++) {
        const block = await rpcClient.command<BlockData[]>([
          {
            method: 'getblock',
            parameters: [transactions[i].height],
          },
        ]);
        if (!block[0]?.tx) {
          await addressEventService.deleteAllByTxIds([transactions[i].id]);
          await transactionService.deleteAllTransactionByTxIds([
            transactions[i].id,
          ]);
        } else {
          if (!block[0].tx.includes(transactions[i].id)) {
            await addressEventService.deleteAllByTxIds([transactions[i].id]);
            await transactionService.deleteAllTransactionByTxIds([
              transactions[i].id,
            ]);
          }
        }
      }
    }
  } catch (error) {
    console.error('validate Mempool Transaction error', error);
  }
  isUpdating = false;
}
