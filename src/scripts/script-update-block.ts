import 'dotenv/config';

import { Connection, createConnection } from 'typeorm';

import rpcClient from '../components/rpc-client/rpc-client';
import { BlockEntity } from '../entity/block.entity';
import { TransactionEntity } from '../entity/transaction.entity';

async function updateUnconfirmedBlocks(connection: Connection) {
  console.log('start update block>>>>', new Date().getSeconds(), 's');

  const transactionRepo = connection.getRepository(TransactionEntity);
  const blockRepo = connection.getRepository(BlockEntity);
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
        const [block] = await rpcClient.command([
          {
            method: 'getblock',
            parameters: [txRaw.blockhash],
          },
        ]);
        await transactionRepo
          .createQueryBuilder()
          .update({
            height: block.height,
            blockHash: txRaw.blockhash,
          })
          .where({
            id: txs[i].id,
          })
          .execute();
      }
      if (txs[i].height && !txs[i].blockHash) {
        const [hash] = await rpcClient.command([
          {
            method: 'getblockhash',
            parameters: [102081],
          },
        ]);
        await transactionRepo
          .createQueryBuilder()
          .update({
            blockHash: hash,
          })
          .where({
            id: txs[i].id,
          })
          .execute();
      }
    }
  }
  console.log('end update block>>>>', new Date().getMilliseconds(), 's');
}

createConnection().then(updateUnconfirmedBlocks);
