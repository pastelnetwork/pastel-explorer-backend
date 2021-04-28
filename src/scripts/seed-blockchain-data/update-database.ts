import 'dotenv/config';

import { Connection } from 'typeorm';

import { AddressEventEntity } from '../../entity/address-event.entity';
import { createTopBalanceRank, createTopReceivedRank } from './create-top-rank';
import {
  batchCreateAddressEvents,
  batchCreateBlocks,
  batchCreateTransactions,
  getLastSavedBlock,
} from './db-utils';
import { getBlocks } from './get-blocks';
import {
  getAddressEvents,
  mapBlockFromRPCToJSON,
  mapTransactionFromRPCToJSON,
} from './mappers';
import { updateBlockConfirmations } from './update-block-confirmations';
import { updateMasternodeList } from './update-masternode-list';
import { updatePeerList } from './update-peer-list';
import { updateStats } from './update-stats';

type BatchAddressEvents = Array<Omit<AddressEventEntity, 'id' | 'transaction'>>;

let isUpdating = false;
export async function updateDatabaseWithBlockchainData(
  connection: Connection,
): Promise<void> {
  if (isUpdating) {
    return;
  }
  isUpdating = true;
  const lastSavedBlockNumber = await getLastSavedBlock(connection);
  let startingBlock = lastSavedBlockNumber + 1;
  let batchSize = 3;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const { blocks, rawTransactions, vinTransactions } = await getBlocks(
        startingBlock,
        batchSize,
      );
      if (blocks.length === 0) {
        break;
      }
      console.log(
        `Processing blocks from ${startingBlock} to ${
          startingBlock + blocks.length - 1
        }`,
      );
      const batchBlocks = blocks.map(mapBlockFromRPCToJSON);
      await batchCreateBlocks(connection, batchBlocks);

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
      try {
        await Promise.all(
          batchAddressEventsChunks.map(b =>
            batchCreateAddressEvents(connection, b),
          ),
        );
      } catch (e) {
        console.log(batchAddressEvents);
      }
      startingBlock = startingBlock + batchSize;
      batchSize = 3;
    } catch (e) {
      if (
        e.code === 'ESOCKETTIMEDOUT' ||
        e?.message === 'Work queue depth exceeded'
      ) {
        // if batch was too big (transation had a lot of vin) and rpc times out -> decrease batch
        batchSize = 1;
        continue;
      }
      break;
    }
  }
  const newLastSavedBlockNumber = await getLastSavedBlock(connection);
  if (newLastSavedBlockNumber > lastSavedBlockNumber) {
    await updateBlockConfirmations();
    await createTopBalanceRank(connection);
    await createTopReceivedRank(connection);
  }

  await updatePeerList(connection);
  await updateMasternodeList(connection);
  await updateStats(connection);
  isUpdating = false;
}
