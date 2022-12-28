import { decode } from 'js-base64';
import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { TicketEntity } from '../../entity/ticket.entity';
import { TransactionEntity } from '../../entity/transaction.entity';
import blockService from '../../services/block.service';
import ticketService from '../../services/ticket.service';
import transactionService from '../../services/transaction.service';
import { getDateErrorFormat } from '../../utils/helpers';
import { updateSenseRequests } from './updated-sense-requests';

export async function updateTickets(
  connection: Connection,
  batchTransactions: Omit<TransactionEntity, 'block'>[],
  blockHeight: number,
): Promise<boolean> {
  const ticketsListOfBlock: IBlockTicketData[] = [];
  for (let i = 0; i < batchTransactions.length; i++) {
    try {
      const tickets = await rpcClient.command<ITicketsResponse[]>([
        {
          method: 'tickets',
          parameters: ['get', batchTransactions[i].id],
        },
      ]);
      const transactionTickets: ITransactionTicketData[] = [];
      for (let j = 0; j < tickets.length; j++) {
        const item = tickets[j];
        if (item.ticket) {
          const existTicket = await ticketService.getTicketId(
            batchTransactions[i].id,
            item.ticket?.type?.toString(),
            item.height,
            JSON.stringify(item.ticket),
          );
          let pastelID = item.ticket?.pastelID?.toString() || '';
          if (item.ticket?.type === 'action-reg') {
            const actionTicket = JSON.parse(
              decode(JSON.stringify(item.ticket.action_ticket)),
            );
            pastelID = actionTicket.caller;
          }
          if (item.ticket?.type === 'nft-reg') {
            const nftTicket = JSON.parse(
              decode(JSON.stringify(item.ticket.nft_ticket)),
            );
            pastelID = nftTicket.author;
          }
          if (item.ticket?.type === 'nft-collection-reg') {
            const nftTicket = JSON.parse(
              decode(JSON.stringify(item.ticket.nft_collection_ticket)),
            );
            pastelID = nftTicket.creator;
          }
          await connection.getRepository(TicketEntity).save({
            id: existTicket?.id,
            type: item.ticket?.type?.toString(),
            height: item.height,
            signature: item.ticket?.signature?.toString() || '',
            pastelID,
            rawData: JSON.stringify(item.ticket),
            timestamp: new Date().getTime(),
            transactionHash: batchTransactions[i].id,
          });
          transactionTickets.push({
            type: item.ticket?.type?.toString(),
            pastelID,
            height: item.height,
          });
          ticketsListOfBlock.push({
            type: item.ticket?.type?.toString(),
            pastelID,
            height: item.height,
            txid: batchTransactions[i].id,
          });
          if (
            item.ticket?.type === 'action-reg' &&
            item.ticket?.action_type === 'sense'
          ) {
            await updateSenseRequests(connection, batchTransactions[i].id, {
              imageTitle: '',
              imageDescription: '',
              isPublic: true,
              ipfsLink: '',
              sha256HashOfSenseResults: '',
            });
          }
        }
      }
      if (transactionTickets.length) {
        transactionService.updateTicketForTransaction(
          transactionTickets,
          batchTransactions[i].id,
        );
      }
    } catch (error) {
      console.error(
        `Update ticket error >>> ${getDateErrorFormat()} >>>`,
        error.message,
      );
    }
  }
  try {
    blockService.updateTotalTicketsForBlock(ticketsListOfBlock, blockHeight);
  } catch (error) {
    console.error(
      `Update total tickets for block error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
  }
  return true;
}
