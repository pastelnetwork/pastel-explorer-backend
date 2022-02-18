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

export async function updateBlockConfirmations(): Promise<void> {
  const [info]: Record<'blocks', number>[] = await rpcClient.command([
    {
      method: 'getinfo',
      parameters: [],
    },
  ]);
  await blockService.updateConfirmations(info.blocks);
}

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

    if (blockHash) {
      const block = await rpcClient.command<BlockData[]>([
        {
          method: 'getblock',
          parameters: [blockHash[0]],
        },
      ]);
      if (block) {
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
          );
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

  const currentBlock = await blockService.getOneByIdOrHeight(
    blockNumber.toString(),
  );

  if (currentBlock.id !== previousBlockHash) {
    await updateBlockAndTransaction(blockNumber, connection);
  }
}

export async function updateUnCorrectBlock(): Promise<void> {
  const blocks = await blockService.getBlockHeightUnCorrect();
  for (const block of blocks) {
    await updateBlockAndTransaction(block.height);
  }
}

export async function updateTransactions(
  connection: Connection = null,
  transactions: TTransactionWithoutOutgoingProps[],
): Promise<void> {
  if (transactions.length) {
    for (const tran of transactions) {
      const addressTransactions =
        await addressEventService.findAllByTransactionHash(tran.id);
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
          const item = addressTransactions?.find(
            a =>
              a.direction === 'Incoming' &&
              a.address === out?.scriptPubKey?.addresses?.[0],
          );
          if (!item) {
            incomingAddress.push(vout?.scriptPubKey?.addresses[0]);
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
              if (txInfo[0].vout) {
                const address =
                  txInfo[0]?.vout[vi.vout]?.scriptPubKey?.addresses[0];
                const item = addressTransactions?.find(
                  a => a.direction === 'Outgoing' && a.address === address,
                );
                if (!item) {
                  outgoingAddress.push(address);
                }
              }
            }
          } catch (err) {
            console.log(err);
          }
        }
        if (outgoingAddress.length || incomingAddress.length) {
          const savedUnconfirmedTransactions =
            await transactionService.getAllByBlockHash(null);
          const { blocks, rawTransactions, vinTransactions } = await getBlocks(
            tran.height,
            1,
            savedUnconfirmedTransactions,
          );
          if (blocks.length) {
            const batchAddressEvents =
              rawTransactions.reduce<BatchAddressEvents>(
                (acc, transaction) => [
                  ...acc,
                  ...getAddressEvents(transaction, vinTransactions),
                ],
                [],
              );

            const batchAddressEventsChunks = [
              ...Array(Math.ceil(batchAddressEvents.length / 15)),
            ].map(() => batchAddressEvents.splice(0, 15));
            for (const batchAddressEventsChunk of batchAddressEventsChunks) {
              const transList = [];
              for (const bAddress of batchAddressEventsChunk) {
                const item = await transactionService.checkTransactionExist(
                  bAddress.transactionHash,
                );
                if (!item) {
                  transList.push(bAddress.transactionHash);
                }
              }
              try {
                const newBatchAddressEvents = batchAddressEventsChunk.filter(
                  a =>
                    outgoingAddress.indexOf(a.address) !== -1 ||
                    (incomingAddress.indexOf(a.address) !== -1 &&
                      transList.indexOf(a.transactionHash) === -1),
                );
                if (newBatchAddressEvents.length) {
                  await batchCreateAddressEvents(
                    connection,
                    newBatchAddressEvents,
                  );
                }
              } catch (err) {
                console.log(err);
              }
            }
          }
        }
      }
    }
  }
}
