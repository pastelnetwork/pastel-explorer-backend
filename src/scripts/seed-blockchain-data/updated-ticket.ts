import { decode } from 'js-base64';
import slugify from 'slugify';
import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { TicketEntity } from '../../entity/ticket.entity';
import blockService from '../../services/block.service';
import nftService from '../../services/nft.service';
import senseService from '../../services/senserequests.service';
import ticketService from '../../services/ticket.service';
import transactionService from '../../services/transaction.service';
import { getDateErrorFormat } from '../../utils/helpers';
import { updateCascade, updateStatusForCascade } from './update-cascade';
import { saveNftInfo } from './updated-nft';
import { updateSenseRequests } from './updated-sense-requests';

let isUpdating = false;

export const reUpdateSenseAndNftData = async (
  connection: Connection,
): Promise<void> => {
  if (isUpdating) {
    return;
  }
  try {
    isUpdating = true;
    const tickets = await ticketService.getAllSenseAndNftWithoutData();
    for (let i = 0; i < tickets.length; i++) {
      try {
        const ticket = JSON.parse(tickets[i].rawData).ticket;
        switch (tickets[i].type) {
          case 'action-reg':
            if (ticket.action_type === 'sense') {
              await updateSenseRequests(
                connection,
                tickets[i].transactionHash,
                {
                  imageTitle: '',
                  imageDescription: '',
                  isPublic: true,
                  ipfsLink: '',
                  sha256HashOfSenseResults: '',
                },
                tickets[i].height,
                tickets[i].transactionTime,
              );
            } else {
              updateCascade(
                connection,
                tickets[i].transactionHash,
                tickets[i].height,
                tickets[i].transactionTime,
              );
            }
            break;
          case 'nft-reg':
            await saveNftInfo(
              connection,
              tickets[i].transactionHash,
              tickets[i].transactionTime,
              tickets[i].height,
            );
            break;
          default:
            break;
        }
      } catch (error) {
        console.error(
          `reUpdateSenseAndNftData (Block height: ${
            tickets[i].height
          }) error >>> ${getDateErrorFormat()} >>>`,
          error.message,
        );
      }
    }
  } catch (error) {
    console.error(
      `reUpdateSenseAndNftData error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
  }
  isUpdating = false;
};

export async function updateTickets(
  connection: Connection,
  transactions: string[],
  blockHeight: number,
): Promise<boolean> {
  const ticketsListOfBlock: IBlockTicketData[] = [];
  for (let i = 0; i < transactions.length; i++) {
    try {
      const tickets = await rpcClient.command<
        ITicketsResponse[] | ICollectionTicketsResponse[]
      >([
        {
          method: 'tickets',
          parameters: ['get', transactions[i]],
        },
      ]);
      const transactionTickets: ITransactionTicketData[] = [];
      for (let j = 0; j < tickets.length; j++) {
        const item = tickets[j] as ITicketsResponse;
        let collection = null;
        if (item.ticket?.type === 'collection-reg') {
          collection = tickets[j] as ICollectionTicketsResponse;
        }
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
          const getCollectionName = async (id: string) => {
            if (!id) {
              return '';
            }
            try {
              const collection = await rpcClient.command([
                {
                  method: 'tickets',
                  parameters: ['get', id],
                },
              ]);
              const collectionTicket = JSON.parse(
                decode(
                  JSON.stringify(collection[0]?.ticket?.collection_ticket),
                ),
              );
              const collectionName = collectionTicket?.collection_name || '';
              return collectionName;
            } catch (error) {
              console.error(
                `RPC tickets find collection ${id} error >>> ${getDateErrorFormat()} >>>`,
                error.message,
              );
              return '';
            }
          };
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
          const getOfferType = async (txId: string) => {
            const regTxId = await getNFTRegistrationIdByOfferId(txId);
            const nft = await nftService.getNftDetailsByTxId(regTxId);
            if (nft?.transactionHash) {
              return {
                type: 'nft-offer',
                transactionHash: nft?.transactionHash,
                regTxId,
              };
            }
            const sense = await senseService.getSenseListByTxId(regTxId);
            return {
              type: 'sense-offer',
              transactionHash: sense[0]?.transactionHash,
              regTxId,
            };
          };
          let cascadeFileName = '';
          let collectionName = '';
          let status = '';
          let offerType = '';
          let txId = '';
          let regTxId = '';
          switch (item.ticket?.type) {
            case 'nft-reg':
              pastelID = JSON.parse(
                decode(JSON.stringify(item.ticket.nft_ticket)),
              ).author;
              collectionName = await getCollectionName(
                JSON.parse(decode(JSON.stringify(item.ticket.nft_ticket)))
                  .collection_txid,
              );
              ticketId = transactions[i];
              status = 'inactive';
              break;
            case 'nft-act':
              ticketId = item.ticket?.reg_txid?.toString() || '';
              await nftService.updateNftStatus(
                item.ticket?.reg_txid?.toString() || '',
                'activated',
                JSON.stringify(item),
              );
              await ticketService.updateStatusForTicket(
                item.ticket?.reg_txid?.toString(),
                'nft-reg',
              );
              break;
            case 'nft-royalty':
              ticketId = item.ticket?.nft_txid?.toString() || '';
              break;
            case 'offer':
              ticketId = await getNftRegistrationId(
                item.ticket?.item_txid?.toString(),
              );
              // eslint-disable-next-line
              const offerInfo = await getOfferType(transactions[i]);
              offerType = offerInfo.type;
              txId = offerInfo.transactionHash;
              regTxId = offerInfo.regTxId;
              break;
            case 'accept':
              ticketId = await getNFTRegistrationIdByOfferId(
                item.ticket?.offer_txid?.toString() || '',
              );
              // eslint-disable-next-line
              const acceptInfo = await getOfferType(
                item.ticket?.offer_txid?.toString(),
              );
              offerType = acceptInfo.type;
              txId = acceptInfo.transactionHash;
              regTxId = acceptInfo.regTxId;
              break;
            case 'transfer':
              ticketId = item.ticket?.registration_txid?.toString() || '';
              // eslint-disable-next-line
              const transferInfo = await getOfferType(
                item.ticket?.offer_txid?.toString(),
              );
              offerType = transferInfo.type;
              txId = transferInfo.transactionHash;
              regTxId = transferInfo.regTxId;
              break;
            case 'action-reg':
              pastelID = JSON.parse(
                decode(JSON.stringify(item.ticket.action_ticket)),
              ).caller;
              cascadeFileName = JSON.parse(
                decode(
                  JSON.stringify(
                    JSON.parse(
                      decode(JSON.stringify(item.ticket.action_ticket)),
                    ).api_ticket,
                  ),
                ),
              )?.file_name;
              ticketId = transactions[i];
              collectionName = await getCollectionName(
                JSON.parse(decode(JSON.stringify(item.ticket.action_ticket)))
                  .collection_txid,
              );
              status = 'inactive';
              break;
            case 'action-act':
              ticketId = item.ticket?.reg_txid?.toString() || '';
              await ticketService.updateStatusForTicket(
                item.ticket?.reg_txid?.toString(),
                'action-act',
              );
              break;
            case 'collection-reg':
              pastelID =
                (collection?.ticket?.collection_ticket?.creator as string) ||
                '';
              ticketId = transactions[i];
              collectionName =
                collection?.ticket?.collection_ticket?.collection_name;
              status = 'inactive';
              break;
            case 'collection-act':
              ticketId = item.ticket?.reg_txid?.toString() || '';
              await ticketService.updateStatusForTicket(
                item.ticket?.reg_txid?.toString(),
                'action-act',
              );
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
            otherData: JSON.stringify({
              cascadeFileName,
              collectionName,
              collectionAlias: collectionName
                ? `${slugify(collectionName)}-${pastelID.substr(0, 10)}`
                : '',
              status,
              offerType: offerType || undefined,
              txId: txId || undefined,
              regTxId: regTxId || undefined,
            }),
            detailId: null,
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
          if (item.ticket?.type === 'action-reg') {
            if (item.ticket?.action_type === 'sense') {
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
            } else {
              await updateCascade(
                connection,
                transactions[i],
                blockHeight,
                transactionTime,
              );
            }
          }

          if (item.ticket?.type === 'action-act') {
            try {
              const actionRegTicket = await ticketService.getRegIdTicket(
                ticketId,
                'action-reg',
              );
              if (actionRegTicket?.height) {
                const ticket = JSON.parse(actionRegTicket.rawData).ticket;
                if (ticket.action_type === 'sense') {
                  await updateSenseRequests(
                    connection,
                    actionRegTicket.transactionHash,
                    {
                      imageTitle: '',
                      imageDescription: '',
                      isPublic: true,
                      ipfsLink: '',
                      sha256HashOfSenseResults: '',
                    },
                    actionRegTicket.height,
                    actionRegTicket.transactionTime,
                  );
                } else {
                  await updateStatusForCascade(
                    connection,
                    ticketId,
                    item.ticket?.type,
                  );
                }
              }
            } catch (error) {
              console.error(
                `Update Sense Requests by Action Activation Ticket (txid: ${ticketId}) error >>> ${getDateErrorFormat()} >>>`,
                error.message,
              );
            }
          }

          if (item.ticket?.type === 'nft-reg') {
            await saveNftInfo(
              connection,
              transactions[i],
              transactionTime,
              blockHeight,
            );
          }

          if (item.ticket?.type === 'nft-act') {
            const nftRegTicket = await ticketService.getRegIdTicket(ticketId);
            if (nftRegTicket?.height) {
              await saveNftInfo(
                connection,
                nftRegTicket.transactionHash,
                nftRegTicket.transactionTime,
                nftRegTicket.height,
              );
            }
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
