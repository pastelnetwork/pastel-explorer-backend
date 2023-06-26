import { decode } from 'js-base64';
import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { CascadeEntity } from '../../entity/cascade.entity';
import cascadeService from '../../services/cascade.service';
import ticketService from '../../services/ticket.service';
import * as ascii85 from '../../utils/ascii85';
import { getDateErrorFormat } from '../../utils/helpers';

const decodeTicket = ticketData => {
  let data = null;
  try {
    data = JSON.parse(decode(ticketData));
  } catch {
    try {
      data = ascii85.decode(ticketData);
    } catch (error) {
      console.error(error);
    }
  }

  return data;
};

export async function updateCascade(
  connection: Connection,
  transactionId: string,
  blockHeight: number,
  transactionTime: number,
  status = 'inactive',
): Promise<void> {
  if (!transactionId) {
    return null;
  }

  try {
    const tickets = await rpcClient.command<IActionRegistrationTicket[]>([
      {
        method: 'tickets',
        parameters: ['get', transactionId],
      },
    ]);
    if (tickets.length) {
      const ticket = tickets[0];
      const actionTicket = decodeTicket(ticket.ticket.action_ticket);
      if (actionTicket) {
        const apiTicket = decodeTicket(actionTicket.api_ticket);
        if (apiTicket) {
          const cascade = await cascadeService.getByTxId(transactionId);
          await connection.getRepository(CascadeEntity).save({
            id: cascade?.id || undefined,
            transactionHash: transactionId,
            blockHeight,
            transactionTime,
            fileName: apiTicket.file_name,
            fileType: apiTicket.file_type,
            fileSize: apiTicket.original_file_size_in_bytes,
            dataHash: apiTicket.data_hash,
            make_publicly_accessible: apiTicket.make_publicly_accessible,
            pastelId: actionTicket.caller,
            rq_ic: apiTicket.rq_ic,
            rq_max: apiTicket.rq_max,
            rq_oti: apiTicket.rq_oti,
            rq_ids: JSON.stringify(apiTicket.rq_ids),
            rawData: JSON.stringify(ticket),
            key: ticket.ticket.key,
            label: ticket.ticket.label,
            storage_fee: ticket.ticket.storage_fee,
            status,
            timestamp: cascade?.timestamp || Date.now(),
          });
          await ticketService.updateDetailIdForTicket(
            transactionId,
            transactionId,
          );
        }
      }
    }
  } catch (error) {
    console.error(
      `Updated cascade (txid: ${transactionId}) error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
  }
}

export async function updateStatusForCascade(
  connection: Connection,
  transactionId: string,
  type = '',
): Promise<void> {
  try {
    const actionRegTicket = await ticketService.getRegIdTicket(
      transactionId,
      'action-reg',
    );
    if (actionRegTicket?.height) {
      const ticket = JSON.parse(actionRegTicket.rawData).ticket;
      if (ticket.action_type === 'cascade') {
        await updateCascade(
          connection,
          actionRegTicket.transactionHash,
          actionRegTicket.height,
          actionRegTicket.transactionTime,
          type === 'nft-act' ? 'active' : 'inactive',
        );
      }
    }
  } catch (error) {
    console.error(
      `Updated status for cascade (txid: ${transactionId}) error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
  }
}
