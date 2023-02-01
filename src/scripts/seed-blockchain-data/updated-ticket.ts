import { decode } from 'js-base64';
import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { TicketEntity } from '../../entity/ticket.entity';
import blockService from '../../services/block.service';
import ticketService from '../../services/ticket.service';
import transactionService from '../../services/transaction.service';
import { getDateErrorFormat } from '../../utils/helpers';
import { updateSenseRequests } from './updated-sense-requests';

export async function updateTickets(
  connection: Connection,
  transactions: string[],
  blockHeight: number,
): Promise<boolean> {
  const ticketsListOfBlock: IBlockTicketData[] = [];
  for (let i = 0; i < transactions.length; i++) {
    try {
      const tickets = await rpcClient.command<ITicketsResponse[]>([
        {
          method: 'tickets',
          parameters: ['get', transactions[i]],
        },
      ]);
      const transactionTickets: ITransactionTicketData[] = [];
      for (let j = 0; j < tickets.length; j++) {
        const item = tickets[j];
        if (item.ticket) {
          const existTicket = await ticketService.getTicketId(
            transactions[i],
            item.ticket?.type?.toString(),
            item.height,
            JSON.stringify(item.ticket),
          );
          let pastelID = item.ticket?.pastelID?.toString() || '';
          let activationTicket = null;
          if (item.ticket?.type === 'action-reg') {
            const actionTicket = JSON.parse(
              decode(JSON.stringify(item.ticket.action_ticket)),
            );
            pastelID = actionTicket.caller;

            try {
              const actionActTickets = await rpcClient.command<
                ITicketsResponse[]
              >([
                {
                  method: 'tickets',
                  parameters: ['find', 'action-act', transactions[i]],
                },
              ]);
              if (actionActTickets[0]?.height) {
                activationTicket = actionActTickets[0];
              }
            } catch (error) {
              console.error(
                `RPC: tickets find action-act ${
                  transactions[i]
                } error >>> ${getDateErrorFormat()} >>>`,
                error.message,
              );
            }
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
            rawData: JSON.stringify({
              ...item,
              activation_ticket: activationTicket,
            }),
            timestamp: new Date().getTime(),
            transactionHash: transactions[i],
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
            txid: transactions[i],
            actionType: (item.ticket?.action_type || '').toString(),
          });
          if (
            item.ticket?.type === 'action-reg' &&
            item.ticket?.action_type === 'sense'
          ) {
            await updateSenseRequests(
              connection,
              transactions[i],
              {
                imageTitle: '',
                imageDescription: '',
                isPublic: true,
                ipfsLink: '',
                sha256HashOfSenseResults: '',
              },
              blockHeight,
            );
          }
        }
      }
      await transactionService.updateTicketForTransaction(
        transactionTickets,
        transactions[i],
      );
    } catch (error) {
      console.error(
        `Update ticket error >>> ${getDateErrorFormat()} >>>`,
        error.message,
      );
    }
  }
  try {
    await blockService.updateTotalTicketsForBlock(
      ticketsListOfBlock,
      blockHeight,
    );
  } catch (error) {
    console.error(
      `Update total tickets for block error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
  }
  return true;
}
