import 'dotenv/config';

import { exit } from 'process';
import { Connection } from 'typeorm';

import { dataSource } from '../datasource';
import { BlockEntity } from '../entity/block.entity';
import { TransactionEntity } from '../entity/transaction.entity';

async function cleanTicketInBlockAndTransaction(connection: Connection) {
  const processingTimeStart = Date.now();
  const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
  const blockRepo = connection.getRepository(BlockEntity);
  const transactionRepo = connection.getRepository(TransactionEntity);
  await blockRepo
    .createQueryBuilder()
    .update()
    .set({
      totalTickets: 0,
      ticketsList: null,
    })
    .where('CAST(height AS INT) < :hideToBlock', { hideToBlock })
    .execute();
  await transactionRepo
    .createQueryBuilder()
    .update()
    .set({
      tickets: null,
      ticketsTotal: 0,
    })
    .where('CAST(height AS INT) < :hideToBlock', { hideToBlock })
    .execute();

  console.log(
    `Processing remove ticket in block and transaction finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
  exit();
}

const createConnection = async () => {
  const connection = await dataSource;
  await cleanTicketInBlockAndTransaction(connection);
};

createConnection()
  .then(async () => {
    // noop
  })
  .catch(error => console.log('TypeORM connection error: ', error));
