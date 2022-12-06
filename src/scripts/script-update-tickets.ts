import 'dotenv/config';

import { exit } from 'process';
import { Connection, createConnection } from 'typeorm';

import rpcClient from '../components/rpc-client/rpc-client';
import { BlockEntity } from '../entity/block.entity';
import { TransactionEntity } from '../entity/transaction.entity';
import { updateTickets } from './seed-blockchain-data/updated-ticket';

async function updateSmartTickets(connection: Connection) {
  const transactionRepo = connection.getRepository(TransactionEntity);
  const blockRepo = connection.getRepository(BlockEntity);
  const processingTimeStart = Date.now();
  const txs = await transactionRepo
    .createQueryBuilder()
    .select(['id'])
    .where('id NOT IN (SELECT transactionHash FROM TicketEntity)')
    .execute();

  if (txs.length) {
    await updateTickets(connection, txs);
  }

  const blocks = await blockRepo
    .createQueryBuilder()
    .select(['id'])
    .getRawMany();

  for (let i = 0; i < blocks.length; i += 1) {
    const transactions = await transactionRepo
      .createQueryBuilder()
      .select(['id'])
      .where('blockHash = :blockHash', { blockHash: blocks[i].id })
      .execute();
    if (transactions.length) {
      const getTicketsCommand = transactions
        .map(t => ({
          method: 'tickets',
          parameters: ['get', t.id],
        }))
        .flat();
      const resRawTickets = await rpcClient.command<TicketData[]>(
        getTicketsCommand,
      );
      await blockRepo
        .createQueryBuilder()
        .update({
          totalTickets: resRawTickets.filter(t => t.height).length,
        })
        .where({
          id: blocks[i].id,
        })
        .execute();
    }
  }

  console.log(
    `Processing update unconfirmed blocks finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
  exit();
}

createConnection().then(updateSmartTickets);
