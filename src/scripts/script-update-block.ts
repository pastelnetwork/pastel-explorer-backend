import 'dotenv/config';

import { exit } from 'process';
import { Connection, createConnection } from 'typeorm';

import { BlockEntity } from '../entity/block.entity';
import blockService from '../services/block.service';
import transactionService from '../services/transaction.service';
import { batchCreateTransactions } from './seed-blockchain-data/db-utils';
import { getBlock } from './seed-blockchain-data/get-blocks';
import {
  getAddressEvents,
  mapBlockFromRPCToJSON,
  mapTransactionFromRPCToJSON,
} from './seed-blockchain-data/mappers';
import { updateAddressEvents } from './seed-blockchain-data/update-block-data';
import { BatchAddressEvents } from './seed-blockchain-data/update-database';
import { updateTickets } from './seed-blockchain-data/updated-ticket';

async function updateBlocks(connection: Connection) {
  const blockRepo = connection.getRepository(BlockEntity);
  const processingTimeStart = Date.now();
  let sqlWhere = null;
  if (process.argv[2]) {
    sqlWhere = `height = ${Number(process.argv[2])}`;
  }
  const blocksList = await blockRepo
    .createQueryBuilder()
    .select(['id', 'height'])
    .where(sqlWhere)
    .getRawMany();

  for (let j = 0; j < blocksList.length; j += 1) {
    const blockHeight = Number(blocksList[j].height);
    const { block, rawTransactions, vinTransactions } = await getBlock(
      blockHeight,
    );
    if (block?.hash) {
      console.log(`Processing block ${blockHeight}`);
      const batchBlock = [block].map(mapBlockFromRPCToJSON);
      await blockRepo.save(batchBlock);
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
      const currentTransactions = await transactionService.getIdByHash(
        block.hash,
      );
      const transactionsLength =
        currentTransactions.length > batchTransactions.length
          ? currentTransactions.length
          : batchTransactions.length;
      for (let i = 0; i < transactionsLength; i++) {
        if (batchTransactions[i]?.id) {
          await batchCreateTransactions(connection, [batchTransactions[i]]);
          await updateAddressEvents(connection, [
            {
              id: batchTransactions[i].id,
              blockHash: block.hash,
              height: blockHeight,
            },
          ]);
        }
        if (currentTransactions[i]?.id) {
          const transaction = batchTransactions.find(
            t => t.id === currentTransactions[i]?.id,
          );
          if (!transaction) {
            await transactionService.updateBlockHashIsNullByHash(
              currentTransactions[i].id,
            );
          }
        }
      }
      await blockService.updateTotalTicketsForBlock([], blockHeight);
      await updateTickets(connection, block.tx, blockHeight);
    }
  }
  console.log(
    `Processing update blocks finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
  exit();
}

createConnection().then(updateBlocks);
