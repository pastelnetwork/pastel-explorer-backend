import 'dotenv/config';

import { Server } from 'socket.io';
import { Connection } from 'typeorm';

import { AddressEventEntity } from '../../entity/address-event.entity';
import blockService from '../../services/block.service';
import transactionService from '../../services/transaction.service';
import { getDateErrorFormat } from '../../utils/helpers';
import { writeLog } from '../../utils/log';
import { createTopBalanceRank, createTopReceivedRank } from './create-top-rank';
import {
  batchCreateAddressEvents,
  batchCreateBlocks,
  batchCreateTransactions,
  batchCreateUnconfirmedTransactions,
} from './db-utils';
import { sendEmailNotification } from './email-notification';
import { getBlocks } from './get-blocks';
import {
  getAddressEvents,
  mapBlockFromRPCToJSON,
  mapTransactionFromRPCToJSON,
} from './mappers';
import {
  deleteReorgBlock,
  updateBlockHash,
  updateNextBlockHashes,
  updatePreviousBlocks,
} from './update-block-data';
import { updateHashrate } from './update-hashrate';
import { updateMasternodeList } from './update-masternode-list';
import { updateStatsMempoolInfo } from './update-mempoolinfo';
import { updateStatsMiningInfo } from './update-mining-info';
import { updateNettotalsInfo } from './update-nettotals';
import { updatePeerList } from './update-peer-list';
// import { updateStatsRawMemPoolInfo } from './update-rawmempoolinfo';
import { updateStats } from './update-stats';

export type BatchAddressEvents = Array<
  Omit<AddressEventEntity, 'id' | 'transaction'>
>;

let isUpdating = false;

export async function saveTransactionsAndAddressEvents(
  connection: Connection,
  rawTransactions: TransactionData[],
  vinTransactions: TransactionData[],
): Promise<void> {
  const batchAddressEvents = rawTransactions.reduce<BatchAddressEvents>(
    (acc, transaction) => [
      ...acc,
      ...getAddressEvents(transaction, vinTransactions),
    ],
    [],
  );

  const batchTransactions = rawTransactions.map(t =>
    mapTransactionFromRPCToJSON(t, JSON.stringify(t), batchAddressEvents),
  );

  for (let i = 0; i < batchTransactions.length; i++) {
    await batchCreateTransactions(connection, [batchTransactions[i]]);
  }

  const batchAddressEventsChunks = [
    ...Array(Math.ceil(batchAddressEvents.length / 15)),
  ].map(() => batchAddressEvents.splice(0, 15));

  await Promise.all(
    batchAddressEventsChunks.map(b => batchCreateAddressEvents(connection, b)),
  );
}

export async function saveUnconfirmedTransactions(
  connection: Connection,
  unconfirmedTransactions: TransactionData[],
  vinTransactions: TransactionData[],
): Promise<void> {
  if (unconfirmedTransactions.length > 0) {
    const unconfirmedAddressEvents =
      unconfirmedTransactions.reduce<BatchAddressEvents>(
        (acc, transaction) => [
          ...acc,
          ...getAddressEvents(transaction, vinTransactions),
        ],
        [],
      );
    const batchUnconfirmedTransactions = unconfirmedTransactions.map(t =>
      mapTransactionFromRPCToJSON(
        t,
        JSON.stringify(t),
        unconfirmedAddressEvents,
      ),
    );
    await batchCreateUnconfirmedTransactions(
      connection,
      batchUnconfirmedTransactions,
    );
  }
}

export async function updateDatabaseWithBlockchainData(
  connection: Connection,
  io?: Server,
): Promise<void> {
  try {
    if (isUpdating) {
      return;
    }
    isUpdating = true;
    const processingTimeStart = Date.now();
    const lastBlockInfo = await blockService.getLastBlockInfo();
    const lastSavedBlockNumber = Number(lastBlockInfo.height);
    let startingBlock = lastSavedBlockNumber + 1;
    const batchSize = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const savedUnconfirmedTransactions =
          await transactionService.getAllByBlockHash(null);

        const {
          blocks,
          rawTransactions,
          vinTransactions,
          unconfirmedTransactions,
        } = await getBlocks(
          startingBlock,
          batchSize,
          savedUnconfirmedTransactions,
        );
        const existBlock = await blockService.getBlockByHash(blocks[0]?.hash);
        if (blocks.length && existBlock) {
          await deleteReorgBlock(
            parseInt(existBlock.height),
            lastSavedBlockNumber,
          );
          startingBlock = parseInt(existBlock.height);
        } else {
          await saveUnconfirmedTransactions(
            connection,
            unconfirmedTransactions,
            vinTransactions,
          );
          if (
            (!blocks || !blocks.length) &&
            unconfirmedTransactions.length &&
            io
          ) {
            try {
              io.emit('getUpdateBlock', {
                blocks,
                rawTransactions,
                unconfirmedTransactions,
              });
            } catch (e) {
              console.error(
                `io.emit unconfirmedTransactions error >>> ${getDateErrorFormat()} >>>`,
                e,
              );
            }
          }
          if (!blocks || blocks.length === 0) {
            await sendEmailNotification(
              lastBlockInfo.timestamp,
              lastBlockInfo.height,
            );
            break;
          }

          console.log(
            `Processing blocks from ${startingBlock} to ${
              startingBlock + blocks.length - 1
            }`,
          );

          const batchBlocks = blocks.map(mapBlockFromRPCToJSON);
          await batchCreateBlocks(connection, batchBlocks);
          await updateBlockHash(
            startingBlock - 1,
            batchBlocks[0]?.previousBlockHash,
          );
          await updatePreviousBlocks(startingBlock - 1, connection);

          await saveTransactionsAndAddressEvents(
            connection,
            rawTransactions,
            vinTransactions,
          );
          await updateHashrate(connection);
          startingBlock = startingBlock + batchSize;
          if (((blocks && blocks.length) || rawTransactions.length) && io) {
            try {
              io.emit('getUpdateBlock', { blocks, rawTransactions });
            } catch (e) {
              console.error(
                `io.emit getUpdateBlock error >>> ${getDateErrorFormat()} >>>`,
                e,
              );
            }
          }
        }
      } catch (e) {
        isUpdating = false;
        await sendEmailNotification(
          lastBlockInfo.timestamp,
          lastBlockInfo.height,
        );
        writeLog(`startingBlock: ${startingBlock} >> ${JSON.stringify(e)}`);
        console.error(
          `Error getBlock ${startingBlock} >>> ${getDateErrorFormat()} >>>`,
          e,
        );
        break;
      }
    }
    const newLastSavedBlockNumber = await blockService.getLastSavedBlock();
    if (newLastSavedBlockNumber > lastSavedBlockNumber) {
      await updateNextBlockHashes();
      await updatePeerList(connection);
      await updateMasternodeList(connection);
    }
    const hourPassedSinceLastUpdate = await updateStats(connection);
    if (hourPassedSinceLastUpdate) {
      await createTopBalanceRank(connection);
      await createTopReceivedRank(connection);
    }
    await updateStatsMiningInfo(connection);
    // await updateStatsRawMemPoolInfo(connection);
    await updateStatsMempoolInfo(connection);
    await updateNettotalsInfo(connection);
    isUpdating = false;
    console.log(
      `Processing blocks finished in ${Date.now() - processingTimeStart}ms`,
    );
  } catch (e) {
    isUpdating = false;
    console.error(`File update-database.ts >>> ${getDateErrorFormat()} >>>`, e);
  }
}
