import 'dotenv/config';

import { exit } from 'process';
import { Connection } from 'typeorm';

import rpcClient from '../components/rpc-client/rpc-client';
import { BlockEntity } from '../entity/block.entity';
import { TransactionEntity } from '../entity/transaction.entity';
import { updateTickets } from './seed-blockchain-data/updated-ticket';

export async function updateSmartTickets(
  connection: Connection,
): Promise<void> {
  const transactionRepo = connection.getRepository(TransactionEntity);
  const blockRepo = connection.getRepository(BlockEntity);
  const processingTimeStart = Date.now();
  let sqlWhere = '1 = 1';
  if (process.argv[2]) {
    sqlWhere = `height = ${Number(process.argv[2])}`;
  }
  const blocks = await blockRepo
    .createQueryBuilder()
    .select(['id', 'height'])
    .where(sqlWhere)
    .getRawMany();

  for (let i = 0; i < blocks.length; i += 1) {
    console.log(`Processing block ${blocks[i].height}`);
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
      await updateTickets(connection, transactions, blocks[i].height);
    }
  }

  console.log(
    `Processing update tickets finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
  exit();
}
