import 'dotenv/config';

import { exit } from 'process';
import { Connection, createConnection } from 'typeorm';

import rpcClient from '../components/rpc-client/rpc-client';
import { BlockEntity } from '../entity/block.entity';
import { TransactionEntity } from '../entity/transaction.entity';
import transactionService from '../services/transaction.service';
import {
  updateBlockAndTransaction,
  updateTransactions,
} from './seed-blockchain-data/update-block-data';

async function updateUnconfirmedBlocks(connection: Connection) {
  const transactionRepo = connection.getRepository(TransactionEntity);
  const blockRepo = connection.getRepository(BlockEntity);
  const processingTimeStart = Date.now();
  const { height } = await blockRepo
    .createQueryBuilder('block')
    .select(['height'])
    .orderBy({
      timestamp: 'DESC',
    })
    .limit(1)
    .getRawOne();
  const txs = await transactionRepo
    .createQueryBuilder()
    .select(['height', 'blockHash', 'id'])
    .where(
      `blockHash is null and (height is null or height < ${
        Number(height) - 1
      })`,
    )
    .getRawMany();

  if (txs.length) {
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
  }
  const transactions = await transactionService.getAllTransactions();
  await updateTransactions(connection, transactions);
  console.log(
    `Processing update unconfirmed blocks finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
  exit();
}

createConnection().then(updateUnconfirmedBlocks);
