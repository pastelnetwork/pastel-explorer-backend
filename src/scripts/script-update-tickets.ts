import 'dotenv/config';

import { exit } from 'process';
import { Connection, createConnection } from 'typeorm';

import { TransactionEntity } from '../entity/transaction.entity';
import { updateTickets } from './seed-blockchain-data/updated-ticket';

async function updateSmartTickets(connection: Connection) {
  const transactionRepo = connection.getRepository(TransactionEntity);
  const processingTimeStart = Date.now();
  const txs = await transactionRepo
    .createQueryBuilder()
    .select(['id'])
    .where('id NOT IN (SELECT transactionHash FROM TicketEntity)')
    .andWhere('timestamp >= 1660064400')
    .execute();

  if (txs.length) {
    await updateTickets(connection, txs);
  }
  console.log(
    `Processing update unconfirmed blocks finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
  exit();
}

createConnection().then(updateSmartTickets);
