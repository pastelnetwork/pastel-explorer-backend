import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { TicketEntity } from '../../entity/ticket.entity';
import { TransactionEntity } from '../../entity/transaction.entity';
import { getDateErrorFormat } from '../../utils/helpers';

export async function updateTickets(
  connection: Connection,
  batchTransactions: Omit<TransactionEntity, 'block'>[],
): Promise<boolean> {
  try {
    for (let i = 0; i < batchTransactions.length; i++) {
      const ticket = await rpcClient.command([
        {
          method: 'tickets',
          parameters: ['get', batchTransactions[i].id],
        },
      ]);
      if (ticket[0]?.ticket) {
        await connection.getRepository(TicketEntity).insert({
          type: ticket[0]?.ticket?.type,
          height: ticket[0].height,
          signature: ticket[0]?.ticket?.signature || '',
          pastelID: ticket[0]?.ticket?.pastelID || '',
          rawData: JSON.stringify(ticket[0]?.ticket),
          timestamp: new Date().getTime(),
          transactionHash: batchTransactions[i].id,
        });
      }
    }
    return true;
  } catch (err) {
    console.error(
      `File updated-ticket.ts error >>> ${getDateErrorFormat()} >>>`,
      err,
    );
    return false;
  }
}
