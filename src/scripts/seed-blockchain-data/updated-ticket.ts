import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { TicketEntity } from '../../entity/ticket.entity';
import { TransactionEntity } from '../../entity/transaction.entity';
import { getDateErrorFormat } from '../../utils/helpers';
import { updateSenseRequests } from './updated-sense-requests';

export async function updateTickets(
  connection: Connection,
  batchTransactions: Omit<TransactionEntity, 'block'>[],
): Promise<boolean> {
  for (let i = 0; i < batchTransactions.length; i++) {
    try {
      const ticket = await rpcClient.command([
        {
          method: 'tickets',
          parameters: ['get', batchTransactions[i].id],
        },
      ]);
      if (ticket[0]?.ticket) {
        await connection.getRepository(TicketEntity).save({
          type: ticket[0]?.ticket?.type,
          height: ticket[0].height,
          signature: ticket[0]?.ticket?.signature || '',
          pastelID: ticket[0]?.ticket?.pastelID || '',
          rawData: JSON.stringify(ticket[0]?.ticket),
          timestamp: new Date().getTime(),
          transactionHash: batchTransactions[i].id,
        });
        if (
          ticket[0]?.ticket?.type === 'action-reg' &&
          ticket[0]?.ticket?.action_type === 'sense'
        ) {
          updateSenseRequests(connection, batchTransactions[i].id, {
            imageTitle: 'd029df4503',
            imageDescription: 'Fine Art and NFT Stuff',
            isPublic: true,
            ipfsLink:
              'https://ipfs.io/ipfs/QmVTMxWzp64zjK4A8joseoWpdphDMHmgV6PKe4ZKCSdJeX',
            sha256HashOfSenseResults:
              '87eb3e231b8c1b7c43529b439f11807121b09d2c6b7a1c72e94a98c65e65ade1',
          });
        }
      }
    } catch (error) {
      console.error(
        `Update price error >>> ${getDateErrorFormat()} >>>`,
        error,
      );
    }
  }
  return true;
}
