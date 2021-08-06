import 'dotenv/config';

import { Server } from 'socket.io';
import { Connection } from 'typeorm';

import { AddressEventEntity } from '../../entity/address-event.entity';
import blockService from '../../services/block.service';
import transactionService from '../../services/transaction.service';
import { createTopBalanceRank, createTopReceivedRank } from './create-top-rank';
import {
  batchCreateAddressEvents,
  batchCreateBlocks,
  batchCreateTransactions,
  batchCreateUnconfirmedTransactions,
} from './db-utils';
import { getBlocks } from './get-blocks';
import {
  getAddressEvents,
  mapBlockFromRPCToJSON,
  mapTransactionFromRPCToJSON,
} from './mappers';
import { updateNextBlockHashes } from './update-block-data';
import { updateMasternodeList } from './update-masternode-list';
import { updateStatsMempoolInfo } from './update-mempoolinfo';
import { updateStatsMiningInfo } from './update-mining-info';
import { updateNettotalsInfo } from './update-nettotals';
import { updatePeerList } from './update-peer-list';
// import { updateStatsRawMemPoolInfo } from './update-rawmempoolinfo';
import { updateStats } from './update-stats';

type BatchAddressEvents = Array<Omit<AddressEventEntity, 'id' | 'transaction'>>;

let isUpdating = false;

async function saveTransactionsAndAddressEvents(
  connection: Connection,
  rawTransactions: TransactionData[],
  vinTransactions: TransactionData[],
) {
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

  await batchCreateTransactions(connection, batchTransactions);

  const batchAddressEventsChunks = [
    ...Array(Math.ceil(batchAddressEvents.length / 15)),
  ].map(() => batchAddressEvents.splice(0, 15));

  await Promise.all(
    batchAddressEventsChunks.map(b => batchCreateAddressEvents(connection, b)),
  );
}
async function saveUnconfirmedTransactions(
  connection: Connection,
  unconfirmedTransactions: TransactionData[],
  vinTransactions: TransactionData[],
) {
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
    const lastSavedBlockNumber = await blockService.getLastSavedBlock();
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
          io.emit('getUpdateBlock', {
            blocks,
            rawTransactions,
            unconfirmedTransactions,
          });
        }
        if (!blocks || blocks.length === 0) {
          break;
        }

        console.log(
          `Processing blocks from ${startingBlock} to ${
            startingBlock + blocks.length - 1
          }`,
        );

        const batchBlocks = blocks.map(mapBlockFromRPCToJSON);
        await batchCreateBlocks(connection, batchBlocks);

        await saveTransactionsAndAddressEvents(
          connection,
          rawTransactions,
          vinTransactions,
        );
        startingBlock = startingBlock + batchSize;
        if (((blocks && blocks.length) || rawTransactions.length) && io) {
          io.emit('getUpdateBlock', { blocks, rawTransactions });
        }
      } catch (e) {
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
    console.error('Update database error >>>', e);
  }
}
