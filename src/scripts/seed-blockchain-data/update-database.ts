import 'dotenv/config';

import { Connection } from 'typeorm';

import { AddressEventEntity } from '../../entity/address-event.entity';
import { createTopRank } from './create-top-rank';
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
import { updatePeers } from './update-peer-list';

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
  let batchSize = 10;
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
          startingBlock + batchSize
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
      batchSize = 10;
    } catch (e) {
      if (e.code === 'ESOCKETTIMEDOUT') {
        // if batch was too big (transation had a lot of vin) and rpc times out -> decrease batch
        batchSize = 1;
        continue;
      }
      break;
    }
  }
  await createTopRank(connection);
  await updatePeers(connection);
  isUpdating = false;
}
