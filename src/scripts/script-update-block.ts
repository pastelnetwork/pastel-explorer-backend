import 'dotenv/config';

import { exit } from 'process';
import { Connection, createConnection } from 'typeorm';

import rpcClient from '../components/rpc-client/rpc-client';
import { BlockEntity } from '../entity/block.entity';
import { TransactionEntity } from '../entity/transaction.entity';
import blockService from '../services/block.service';
import transactionService from '../services/transaction.service';
import { updateSmartTickets } from './script-update-tickets';
import { batchCreateTransactions } from './seed-blockchain-data/db-utils';
import { getBlock, getBlocks } from './seed-blockchain-data/get-blocks';
import {
  getAddressEvents,
  mapBlockFromRPCToJSON,
  mapTransactionFromRPCToJSON,
} from './seed-blockchain-data/mappers';
import {
  updateAddressEvents,
  updateBlockAndTransaction,
} from './seed-blockchain-data/update-block-data';
import { BatchAddressEvents } from './seed-blockchain-data/update-database';
import { updateTickets } from './seed-blockchain-data/updated-ticket';

async function updateUnconfirmedBlocks(connection: Connection) {
  const transactionRepo = connection.getRepository(TransactionEntity);
  const blockRepo = connection.getRepository(BlockEntity);
  const processingTimeStart = Date.now();
  let blockHeight = 0;
  let sqlWhere = '';
  if (process.argv[2]) {
    blockHeight = Number(process.argv[2]);
    sqlWhere = `height = ${Number(blockHeight)}`;
  } else {
    const { height } = await blockRepo
      .createQueryBuilder('block')
      .select(['height'])
      .orderBy({
        timestamp: 'DESC',
      })
      .limit(1)
      .getRawOne();
    blockHeight = height;
    sqlWhere = `blockHash is null and (height is null or height < ${
      Number(height) - 1
    })`;
  }
  const txs = await transactionRepo
    .createQueryBuilder()
    .select(['height', 'blockHash', 'id'])
    .where(sqlWhere)
    .getRawMany();

  if (!process.argv[2]) {
    for (let i = 0; i < txs.length; i += 1) {
      if (!txs[i].height && !txs[i].blockHash) {
        const [txRaw] = await rpcClient.command([
          {
            method: 'getrawtransaction',
            parameters: [txs[i].id, 1],
          },
        ]);
        const block = await rpcClient.command([
          {
            method: 'getblock',
            parameters: [txRaw.blockhash],
          },
        ]);
        const existBlock = await blockRepo
          .createQueryBuilder()
          .select('id')
          .where('id = :blockHash', { blockHash: txRaw.blockhash })
          .getRawOne();
        if (existBlock) {
          await transactionRepo
            .createQueryBuilder()
            .update({
              height: block[0].height,
              blockHash: txRaw.blockhash,
            })
            .where({
              id: txs[i].id,
            })
            .execute();
        } else {
          if (block[0].height) {
            await updateBlockAndTransaction(block[0].height, connection);
          }
        }
      }
      if (txs[i].height && !txs[i].blockHash) {
        const [hash] = await rpcClient.command([
          {
            method: 'getblockhash',
            parameters: [txs[i].height],
          },
        ]);
        const existBlock = await blockRepo
          .createQueryBuilder()
          .select('id')
          .where('id = :blockHash', { blockHash: hash })
          .getRawOne();
        if (existBlock) {
          await transactionRepo
            .createQueryBuilder()
            .update({
              blockHash: hash,
            })
            .where({
              id: txs[i].id,
            })
            .execute();
        } else {
          await updateBlockAndTransaction(txs[i].height, connection);
        }
      }
    }
    const transactions = await transactionService.getAllTransactions();
    await updateAddressEvents(connection, transactions);
  } else {
    const savedUnconfirmedTransactions =
      await transactionService.getAllByBlockHash(null);
    const { blocks, rawTransactions, vinTransactions } = await getBlocks(
      blockHeight,
      1,
      savedUnconfirmedTransactions,
    );
    const blockWithTransactions = blocks.map(b => ({
      ...b,
      height: parseInt(b.height).toString(),
      transactions: b.tx.map(t => rawTransactions.find(tr => tr.txid === t)),
    }));
    const batchBlock = blockWithTransactions.map(mapBlockFromRPCToJSON);
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
    for (let i = 0; i < batchTransactions.length; i++) {
      await batchCreateTransactions(connection, [batchTransactions[i]]);
      await updateAddressEvents(connection, [
        {
          id: batchTransactions[i].id,
          blockHash: blocks[0].hash,
          height: blockHeight,
        },
      ]);
    }
  }
  await updateSmartTickets(connection);
  console.log(
    `Processing update unconfirmed blocks finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
  exit();
}

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
