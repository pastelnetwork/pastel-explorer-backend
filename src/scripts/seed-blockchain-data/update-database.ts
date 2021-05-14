import 'dotenv/config';

import { Connection } from 'typeorm';

import { AddressEventEntity } from '../../entity/address-event.entity';
import transactionService from '../../services/transaction.service';
import { createTopBalanceRank, createTopReceivedRank } from './create-top-rank';
import {
  batchCreateAddressEvents,
  batchCreateBlocks,
  batchCreateTransactions,
  batchCreateUnconfirmedTransactions,
  getLastSavedBlock,
} from './db-utils';
import { getBlocks } from './get-blocks';
import {
  getAddressEvents,
  mapBlockFromRPCToJSON,
  mapTransactionFromRPCToJSON,
} from './mappers';
import {
  updateBlockConfirmations,
  updateNextBlockHashes,
} from './update-block-data';
import { updateMasternodeList } from './update-masternode-list';
import { updatePeerList } from './update-peer-list';
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
    const unconfirmedAddressEvents = unconfirmedTransactions.reduce<BatchAddressEvents>(
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
): Promise<void> {
  if (isUpdating) {
    return;
  }
  isUpdating = true;
  const processingTimeStart = Date.now();
  const lastSavedBlockNumber = await getLastSavedBlock(connection);
  let startingBlock = lastSavedBlockNumber + 1;
  const batchSize = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const savedUnconfirmedTransactions = await transactionService.getAllByBlockHash(
        null,
      );

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
      if (blocks.length === 0) {
        break;
      }

      console.log(`Processing blocks from ${startingBlock} to ${
        startingBlock + blocks.length - 1
      }`);

      const batchBlocks = blocks.map(mapBlockFromRPCToJSON);
      await batchCreateBlocks(connection, batchBlocks);

      await saveTransactionsAndAddressEvents(
        connection,
        rawTransactions,
        vinTransactions,
      );
      startingBlock = startingBlock + batchSize;
    } catch (e) {
      break;
    }
  }
  const newLastSavedBlockNumber = await getLastSavedBlock(connection);
  if (newLastSavedBlockNumber > lastSavedBlockNumber) {
    await updateBlockConfirmations();
    await updateNextBlockHashes();
    await createTopBalanceRank(connection);
    await createTopReceivedRank(connection);
  }

  await updatePeerList(connection);
  await updateMasternodeList(connection);
  await updateStats(connection);
  isUpdating = false;
  console.log(`Processing blocks finished in ${Date.now() - processingTimeStart}ms`);
}
