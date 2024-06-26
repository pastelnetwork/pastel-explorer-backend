import 'dotenv/config';

import { Server } from 'socket.io';
import { Connection } from 'typeorm';

import { AddressEventEntity } from '../../entity/address-event.entity';
import { TransactionEntity } from '../../entity/transaction.entity';
import addressEventsService from '../../services/address-events.service';
import blockService from '../../services/block.service';
import transactionService from '../../services/transaction.service';
import { getDateErrorFormat, getNonZeroAddresses } from '../../utils/helpers';
import { writeLog } from '../../utils/log';
import { createTopBalanceRank } from './create-top-rank';
import {
  batchCreateAddressEvents,
  batchCreateBlocks,
  batchCreateTransactions,
  batchCreateUnconfirmedTransactions,
} from './db-utils';
import { sendNotificationEmail } from './email-notification';
import { getBlocks } from './get-blocks';
import {
  getAddressEvents,
  mapBlockFromRPCToJSON,
  mapTransactionFromRPCToJSON,
} from './mappers';
import { updateAddress } from './update-address';
import {
  deleteReorgBlock,
  updateBlockHash,
  updateNextBlockHashes,
} from './update-block-data';
import { updateHashrate } from './update-hashrate';
import { updateMasternodeList } from './update-masternode-list';
import { updateStatsMempoolInfo } from './update-mempoolinfo';
import { updateStatsMiningInfo } from './update-mining-info';
import { updateNettotalsInfo } from './update-nettotals';
import { updatePeerList } from './update-peer-list';
import { insertRegisteredCascadeFiles } from './update-registered-cascade-files';
import { insertRegisteredSenseFiles } from './update-registered-sense-files';
import { updateStats } from './update-stats';
import { insertSupernodeFeeSchedule } from './update-supernode-fee-schedule';
import { updateTicketsByBlockHeight } from './updated-ticket';

export type BatchAddressEvents = Array<
  Omit<AddressEventEntity, 'id' | 'transaction'>
>;

let isUpdating = false;

async function saveAddress(connection, batchAddressEventsChunks) {
  for (let i = 0; i < batchAddressEventsChunks.length; i++) {
    const items = batchAddressEventsChunks[i];
    for (let i = 0; i < items.length; i++) {
      await updateAddress(connection, items[i].address);
    }
  }
}

export async function saveTransactionsAndAddressEvents(
  connection: Connection,
  rawTransactions: TransactionData[],
  vinTransactions: TransactionData[],
  batchAddressEvents: BatchAddressEvents,
): Promise<Omit<TransactionEntity, 'block'>[]> {
  const batchTransactions = rawTransactions.map(t =>
    mapTransactionFromRPCToJSON(
      { ...t, ticketsTotal: -1 },
      JSON.stringify(t),
      batchAddressEvents,
    ),
  );

  await batchCreateTransactions(connection, batchTransactions);

  const batchAddressEventsChunks = [
    ...Array(Math.ceil(batchAddressEvents.length / 15)),
  ].map(() => batchAddressEvents.splice(0, 15));

  await Promise.all(
    batchAddressEventsChunks.map(b => batchCreateAddressEvents(connection, b)),
  );
  saveAddress(connection, batchAddressEventsChunks);
  return batchTransactions;
}

export async function saveUnconfirmedTransactions(
  connection: Connection,
  unconfirmedTransactions: TransactionData[],
  vinTransactions: TransactionData[],
): Promise<void> {
  if (unconfirmedTransactions?.length > 0) {
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

const updateOtherData = async (connection: Connection) => {
  await updateNextBlockHashes();
  await updatePeerList(connection);
  await updateMasternodeList(connection);
  await createTopBalanceRank(connection);
  await updateStatsMiningInfo(connection);
  await updateStatsMempoolInfo(connection);
};

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
    let nonZeroAddresses = await addressEventsService.findAllNonZeroAddresses();
    const batchSize = 1;
    let counter = 1;
    let isNewBlock = false;
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
        let blockHeight = Number(lastBlockInfo.height);
        let blockTime = Number(lastBlockInfo.timestamp);
        if (blocks.length) {
          blockHeight = Number(blocks[0].height);
          blockTime = Number(blocks[0].time);
        }
        await updateNettotalsInfo(connection, blockHeight, blockTime * 1000);
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
            unconfirmedTransactions?.length &&
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
            await sendNotificationEmail(
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
            connection,
          );

          const batchAddressEvents = rawTransactions.reduce<BatchAddressEvents>(
            (acc, transaction) => [
              ...acc,
              ...getAddressEvents(transaction, vinTransactions),
            ],
            [],
          );
          await saveTransactionsAndAddressEvents(
            connection,
            rawTransactions,
            vinTransactions,
            batchAddressEvents,
          );
          isNewBlock = true;
          nonZeroAddresses = getNonZeroAddresses(
            nonZeroAddresses,
            batchAddressEvents,
          );
          await updateStats(
            connection,
            nonZeroAddresses,
            Number(blocks[0].height),
            blocks[0].time * 1000,
          );
          await updateTicketsByBlockHeight(
            connection,
            Number(blocks[0].height),
          );

          await insertSupernodeFeeSchedule(
            connection,
            Number(blocks[0].height),
            blocks[0].hash,
            blocks[0].time,
          );
          await insertRegisteredCascadeFiles(
            connection,
            Number(blocks[0].height),
            blocks[0].time * 1000,
          );
          await insertRegisteredSenseFiles(
            connection,
            Number(blocks[0].height),
            blocks[0].time * 1000,
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
          if (counter % 100 === 0) {
            await updateOtherData(connection);
          }
          counter += 1;
        }
      } catch (e) {
        isUpdating = false;
        await sendNotificationEmail(
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
    if (isNewBlock) {
      await updateOtherData(connection);
    }
    isUpdating = false;
    console.log(
      `Processing blocks finished in ${Date.now() - processingTimeStart}ms`,
    );
  } catch (e) {
    isUpdating = false;
    console.error(`File update-database.ts >>> ${getDateErrorFormat()} >>>`, e);
  }
}
