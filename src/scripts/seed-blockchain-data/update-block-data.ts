import { Connection, getConnection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import blockService from '../../services/block.service';
import transactionService from '../../services/transaction.service';
import { writeLog } from '../../utils/log';
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
        const currentTransactions = await transactionService.getIdByHash(
          currentBlock.id,
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
          block[0].time,
          block[0].confirmations,
          block[0].difficulty,
          block[0].merkleroot,
          block[0].nonce,
          block[0].solution,
          block[0].size,
          transactions.length,
          transactions,
          batchAddressEvents,
        );
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
            newRawTransactions.push(t.txid);
          }
        }
        for (const t of vinTransactions) {
          if (currentTxIds.indexOf(t.txid) === -1) {
            newVinTransactions.push(t.txid);
          }
        }
        for (const t of unconfirmedTransactions) {
          if (currentTxIds.indexOf(t.txid) === -1) {
            newUnconfirmedTransactions.push(t.txid);
          }
        }
        if (newRawTransactions) {
          await saveUnconfirmedTransactions(
            connection || getConnection(),
            newUnconfirmedTransactions,
            newVinTransactions,
          );
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
    updateBlockAndTransaction(blockNumber, connection);
  }
}

export async function updateUnCorrectBlock(): Promise<void> {
  const blocks = await blockService.getBlockHeightUnCorrect();
  for (const block of blocks) {
    updateBlockAndTransaction(block.height);
  }
}
