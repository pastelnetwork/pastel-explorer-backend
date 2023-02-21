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
          let ticketId = '';
          let pastelID = item.ticket?.pastelID?.toString() || '';
          const getNftRegistrationId = async (
            txId: string,
          ): Promise<string> => {
            try {
              const nftActTickets = await rpcClient.command<ITicketsResponse[]>(
                [
                  {
                    method: 'tickets',
                    parameters: ['get', txId],
                  },
                ],
              );
              return nftActTickets[0].ticket?.reg_txid?.toString() || '';
            } catch (error) {
              console.error(
                `RPC tickets find act ${txId} error >>> ${getDateErrorFormat()} >>>`,
                error.message,
              );
              return '';
            }
          };
          const getNFTRegistrationIdByOfferId = async (
            txId: string,
          ): Promise<string> => {
            try {
              const offerTickets = await rpcClient.command<ITicketsResponse[]>([
                {
                  method: 'tickets',
                  parameters: ['get', txId],
                },
              ]);

              return await getNftRegistrationId(
                offerTickets[0].ticket?.item_txid?.toString() || '',
              );
            } catch (error) {
              console.error(
                `RPC tickets find offer or act ${txId} error >>> ${getDateErrorFormat()} >>>`,
                error.message,
              );
              return '';
            }
          };
          switch (item.ticket?.type) {
            case 'nft-reg':
              pastelID = JSON.parse(
                decode(JSON.stringify(item.ticket.nft_ticket)),
              ).author;
              ticketId = transactions[i];
              break;
            case 'nft-act':
              ticketId = item.ticket?.reg_txid?.toString() || '';
              break;
            case 'nft-royalty':
              ticketId = item.ticket?.nft_txid?.toString() || '';
              break;
            case 'offer':
              ticketId = await getNftRegistrationId(
                item.ticket?.item_txid?.toString(),
              );
              break;
            case 'accept':
              ticketId = await getNFTRegistrationIdByOfferId(
                item.ticket?.offer_txid?.toString() || '',
              );
              break;
            case 'transfer':
              ticketId = item.ticket?.registration_txid?.toString() || '';
              break;
            case 'action-reg':
              pastelID = JSON.parse(
                decode(JSON.stringify(item.ticket.action_ticket)),
              ).caller;
              ticketId = transactions[i];
              break;
            case 'action-act':
              ticketId = item.ticket?.reg_txid?.toString() || '';
              break;
            case 'nft-collection-reg':
              pastelID = JSON.parse(
                decode(JSON.stringify(item.ticket.nft_collection_ticket)),
              ).creator;
              ticketId = transactions[i];
              break;
            case 'nft-collection-act':
              ticketId = item.ticket?.reg_txid?.toString() || '';
              break;
            case 'pastelid':
              ticketId = transactions[i];
              break;
            case 'username-change':
              ticketId = transactions[i];
              break;
            default:
              break;
          }
          let transactionTime = null;
          try {
            const transaction = await rpcClient.command<TransactionData[]>([
              {
                method: 'getrawtransaction',
                parameters: [transactions[i], 1],
              },
            ]);
            transactionTime = transaction[0].time * 1000;
          } catch (error) {
            console.error(
              `RPC getrawtransaction ${
                transactions[i]
              } error >>> ${getDateErrorFormat()} >>>`,
              error.message,
            );
          }
          await connection.getRepository(TicketEntity).save({
            id: existTicket?.id,
            type: item.ticket?.type?.toString(),
            height: item.height,
            signature: item.ticket?.signature?.toString() || '',
            pastelID,
            rawData: JSON.stringify(item),
            transactionTime,
            timestamp: new Date().getTime(),
            transactionHash: transactions[i],
            ticketId,
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
              transactionTime,
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
        `Update ticket (txid: ${
          transactions[i]
        }) error >>> ${getDateErrorFormat()} >>>`,
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
      `Update total tickets for block (${blockHeight}) error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
  }
  return true;
}
