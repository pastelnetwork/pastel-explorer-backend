import { Connection, createConnection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import blockService from '../../services/block.service';
import transactionService from '../../services/transaction.service';
import { writeLog } from '../../utils/log';
import { getBlocks } from './get-blocks';
import {
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

  const prevBlock = await blockService.getOneByIdOrHeight(
    blockNumber.toString(),
  );
  if (prevBlock.id !== previousBlockHash) {
    try {
      const block = await rpcClient.command<BlockData[]>([
        {
          method: 'getblock',
          parameters: [previousBlockHash],
        },
      ]);

      if (block.length > 0) {
        const txIds = block[0].tx;
        const currentBlock = await blockService.getOneByIdOrHeight(
          blockNumber.toString(),
        );
        const currentTransactions = await transactionService.getIdByHash(
          currentBlock.id,
        );
        await blockService.updateBlockHash(
          block[0].hash,
          blockNumber,
          prevBlock.id,
        );
        const currentTxIds = [];
        for (const t of currentTransactions) {
          if (txIds.indexOf(t.id) === -1) {
            await transactionService.updateBlockHashNullByTxId(t.id);
          } else {
            currentTxIds.push(t.id);
          }
        }
        for (const txId of txIds) {
          await transactionService.updateBlockHashById(previousBlockHash, txId);
        }
        if (currentTxIds.length) {
          const savedUnconfirmedTransactions =
            await transactionService.getAllByBlockHash(null);
          const batchSize = 1;
          const { rawTransactions, vinTransactions, unconfirmedTransactions } =
            await getBlocks(
              blockNumber,
              batchSize,
              savedUnconfirmedTransactions,
            );
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
          if (connection) {
            await saveUnconfirmedTransactions(
              connection,
              newUnconfirmedTransactions,
              newVinTransactions,
            );
            await saveTransactionsAndAddressEvents(
              connection,
              newRawTransactions,
              newVinTransactions,
            );
          } else {
            createConnection().then(connection => {
              const saveData = async () => {
                await saveUnconfirmedTransactions(
                  connection,
                  newUnconfirmedTransactions,
                  newVinTransactions,
                );
                await saveTransactionsAndAddressEvents(
                  connection,
                  newRawTransactions,
                  newVinTransactions,
                );
              };
              saveData();
            });
          }
        }
      }
    } catch (err) {
      writeLog(`Update block: ${blockNumber} >> ${JSON.stringify(err)}`);
    }
  }
}
