import { Connection, getConnection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import addressEventService from '../../services/address-events.service';
import blockService from '../../services/block.service';
import transactionService, {
  TTransactionWithoutOutgoingProps,
} from '../../services/transaction.service';
import { writeLog } from '../../utils/log';
import { batchCreateAddressEvents } from './db-utils';
import { getBlocks } from './get-blocks';
import { getAddressEvents } from './mappers';
import {
  BatchAddressEvents,
  saveTransactionsAndAddressEvents,
  saveUnconfirmedTransactions,
} from './update-database';

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
          await saveTransactionsAndAddressEvents(
            connection || getConnection(),
            newRawTransactions,
            newVinTransactions,
            parseInt(block[0].height),
          );
        }

        const newTransactions = await transactionService.getAllByBlockHash(
          block[0].hash,
        );
        if (newTransactions.length) {
          updateAddressEvents(connection || getConnection(), newTransactions);
        }
      }
    }
  } catch (err) {
    writeLog(`Error update block: ${blockNumber} >> ${JSON.stringify(err)}`);
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
  } catch (err) {
    writeLog(`Error updateBlockHash: ${blockNumber} >> ${JSON.stringify(err)}`);
  }
}

export async function updateUnCorrectBlock(): Promise<void> {
  const blocks = await blockService.getBlockHeightUnCorrect();
  for (const block of blocks) {
    await updateBlockAndTransaction(block.height);
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
                  amount: txInfo[0].vout[vi.vout]?.value,
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
      const transactions = await transactionService.getAllByBlockHash(block.id);
      for (let i = 0; i < transactions.length; i++) {
        await addressEventService.deleteEventAndAddressByTransactionHash(
          transactions[i].id,
        );
      }
      await transactionService.deleteTransactionByBlockHash(block.id);
      await blockService.deleteBlockByHash(block.id);
    }
  }
}
