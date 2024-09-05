import axios from 'axios';
import fs from 'fs';
import { decode } from 'js-base64';
import path from 'path';
import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { CascadeEntity } from '../../entity/cascade.entity';
import { TicketEntity } from '../../entity/ticket.entity';
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

export async function createCascadeRawDataFile(id: string, data: string) {
  try {
    const dir = process.env.CASCADE_DRAW_DATA_FOLDER;

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    fs.writeFileSync(path.join(dir, `${id}.json`), data);
  } catch (error) {
    console.error(`create raw data of Cascade ${id} error: `, error);
  }
}

export async function updateCascade(
  connection: Connection,
  transactionId: string,
  blockHeight: number,
  transactionTime: number,
  status = 'inactive',
): Promise<void> {
  const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
  if (!transactionId || blockHeight < hideToBlock) {
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
      try {
        const ticket = tickets[0];
        const actionTicket = decodeTicket(ticket.ticket.action_ticket);
        if (actionTicket) {
          const apiTicket = decodeTicket(actionTicket.api_ticket);
          if (apiTicket) {
            const cascade = await cascadeService.getByTxId(transactionId);
            await connection.getRepository(CascadeEntity).save({
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
              rawData: '',
              key: ticket.ticket.key,
              label: ticket.ticket.label,
              storage_fee: ticket.ticket.storage_fee,
              status,
              timestamp: cascade?.timestamp || Date.now(),
              sub_type: null,
              tx_info: null,
              sha3_256_hash_of_original_file: null,
              volumes: null,
              files: null,
            });
            await ticketService.updateDetailIdForTicket(
              transactionId,
              transactionId,
            );
            await createCascadeRawDataFile(
              transactionId,
              JSON.stringify(ticket),
            );
          }
        } else if (ticket.ticket.contract_ticket) {
          const contractTicket = decodeTicket(ticket.ticket.contract_ticket);
          await connection.getRepository(CascadeEntity).save({
            transactionHash: transactionId,
            blockHeight,
            transactionTime,
            fileName: contractTicket.name_of_original_file,
            fileType: '',
            fileSize: contractTicket.size_of_original_file_mb,
            dataHash: '',
            make_publicly_accessible: '',
            pastelId: '',
            rq_ic: 0,
            rq_max: 0,
            rq_oti: '',
            rq_ids: '',
            rawData: '',
            key: ticket.ticket.key,
            label: '',
            storage_fee: ticket.tx_info.multisig_tx_total_fee,
            status,
            timestamp: ticket?.ticket?.timestamp || Date.now(),
            sub_type: contractTicket.sub_type,
            tx_info: JSON.stringify(ticket.tx_info),
            sha3_256_hash_of_original_file:
              contractTicket.sha3_256_hash_of_original_file,
            volumes: JSON.stringify(contractTicket.volumes),
            files: null,
          });
          await ticketService.updateDetailIdForTicket(
            transactionId,
            transactionId,
          );
          await createCascadeRawDataFile(transactionId, JSON.stringify(ticket));
        }
      } catch (error) {
        await connection.getRepository(CascadeEntity).save({
          transactionHash: transactionId,
          blockHeight,
          transactionTime,
          fileName: '',
          fileType: '',
          fileSize: 0,
          dataHash: '',
          make_publicly_accessible: '',
          pastelId: '',
          rq_ic: 0,
          rq_max: 0,
          rq_oti: '',
          rq_ids: '',
          rawData: '',
          key: '',
          label: '',
          storage_fee: 0,
          status,
          timestamp: Date.now(),
          sub_type: null,
          tx_info: null,
          sha3_256_hash_of_original_file: null,
          volumes: null,
          files: null,
        });
        await createCascadeRawDataFile(
          transactionId,
          JSON.stringify({ ticket: tickets }),
        );
        console.error(
          `Updated cascade (txid: ${transactionId}) error >>> ${getDateErrorFormat()} >>>`,
          error.message,
        );
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

export async function updateCascadeByBlockHeight(
  connection: Connection,
  blockHeight: number,
  tickets?: ITicketList[],
): Promise<boolean> {
  try {
    const ticketRepo = connection.getRepository(TicketEntity);
    let ticketList = tickets;
    if (!tickets?.length) {
      ticketList = await ticketRepo
        .createQueryBuilder()
        .select('transactionHash, transactionTime, type')
        .where('height = :blockHeight', { blockHeight })
        .andWhere(
          "((type = 'action-reg' AND rawData LIKE '%\"action_type\":\"cascade\"%') OR (type = 'contract' AND sub_type = 'cascade_multi_volume_metadata'))",
        )
        .getRawMany();
    }

    for (let i = 0; i < ticketList.length; i++) {
      let status = 'inactive';
      const actionActTicket = await ticketService.getActionIdTicket(
        ticketList[i].transactionHash,
        'action-act',
      );
      if (actionActTicket?.transactionHash) {
        status = 'active';
      }
      await updateCascade(
        connection,
        ticketList[i].transactionHash,
        blockHeight,
        ticketList[i].transactionTime,
        status,
      );
    }
  } catch (error) {
    console.error(
      `Update Cascade (Block height: ${blockHeight}) error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
    return false;
  }
}

export async function updateCascadeByTxId(
  connection: Connection,
  txId: string,
): Promise<boolean> {
  try {
    const ticketRepo = connection.getRepository(TicketEntity);
    const ticketList = await ticketRepo
      .createQueryBuilder()
      .select('height, transactionHash, transactionTime')
      .where('transactionHash = :txId', { txId })
      .andWhere("type IN ('action-reg')")
      .andWhere('rawData LIKE \'%"action_type":"cascade"%\'')
      .getRawMany();
    for (let i = 0; i < ticketList.length; i++) {
      let status = 'inactive';
      const actionActTicket = await ticketService.getActionIdTicket(
        ticketList[i].transactionHash,
        'action-act',
      );
      if (actionActTicket?.transactionHash) {
        status = 'active';
      }
      await updateCascade(
        connection,
        txId,
        ticketList[i].blockHeight,
        ticketList[i].transactionTime,
        status,
      );
    }
  } catch (error) {
    console.error(
      `Update Cascade (txID: ${txId}) error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
    return false;
  }
}

async function getCascadeMultiVolumeStatus(fileId: string) {
  try {
    const openNodeApiURL = process.env.OPENNODE_API_URL;
    if (!openNodeApiURL) {
      return;
    }
    const { data } = await axios.get<{
      total_number_of_registered_cascade_files: number;
      data_size_bytes_counter: number;
      average_file_size_in_bytes: number;
      as_of_timestamp: number;
      as_of_datetime_utc_string: string;
    }>(`${openNodeApiURL}/openapi/cascade/start/${fileId}`, {
      timeout: 50000,
    });
    if (data) {
      return data;
    }
  } catch (error) {
    console.error(
      `Get Cascade Multi Volume Status error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
    return null;
  }
}

async function getCascadeMultiVolumeFiles(fileId: string) {
  try {
    const openNodeApiURL = process.env.OPENNODE_API_URL;
    if (!openNodeApiURL) {
      return;
    }
    const { data } = await axios.get<{
      total_number_of_registered_cascade_files: number;
      data_size_bytes_counter: number;
      average_file_size_in_bytes: number;
      as_of_timestamp: number;
      as_of_datetime_utc_string: string;
    }>(`${openNodeApiURL}/openapi/cascade/registration_details/${fileId}`, {
      timeout: 50000,
    });
    if (data) {
      return data;
    }
  } catch (error) {
    console.error(
      `Get Cascade Multi Volume Status error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
    return null;
  }
}

export async function updateCascadeData(
  transactionId: string,
  blockHeight: number,
  transactionTime: number,
  status = 'inactive',
): Promise<void> {
  const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
  if (!transactionId || blockHeight < hideToBlock) {
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
      try {
        const ticket = tickets[0];
        const actionTicket = decodeTicket(ticket.ticket.action_ticket);
        if (actionTicket) {
          const apiTicket = decodeTicket(actionTicket.api_ticket);
          if (apiTicket) {
            const cascade = await cascadeService.getByTxId(transactionId);
            await cascadeService.save({
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
              rawData: '',
              key: ticket.ticket.key,
              label: ticket.ticket.label,
              storage_fee: ticket.ticket.storage_fee,
              status,
              timestamp: cascade?.timestamp || Date.now(),
              sub_type: null,
              tx_info: null,
              sha3_256_hash_of_original_file: null,
              volumes: null,
              files: null,
            });
            await ticketService.updateDetailIdForTicket(
              transactionId,
              transactionId,
            );
            await createCascadeRawDataFile(
              transactionId,
              JSON.stringify(ticket),
            );
          }
        } else if (ticket.ticket.contract_ticket) {
          const contractTicket = decodeTicket(ticket.ticket.contract_ticket);
          let cascadeMultiVolumeStatus = null;
          let files = null;
          if (contractTicket.sub_type === 'cascade_multi_volume_metadata') {
            cascadeMultiVolumeStatus = await getCascadeMultiVolumeStatus(
              contractTicket.name_of_original_file,
            );
            files = await getCascadeMultiVolumeFiles(
              contractTicket.name_of_original_file,
            );
          }
          await cascadeService.save({
            transactionHash: transactionId,
            blockHeight,
            transactionTime,
            fileName: contractTicket.name_of_original_file,
            fileType: '',
            fileSize: contractTicket.size_of_original_file_mb,
            dataHash: '',
            make_publicly_accessible:
              cascadeMultiVolumeStatus?.make_publicly_accessible || '',
            pastelId: cascadeMultiVolumeStatus?.app_pastelid || '',
            rq_ic: 0,
            rq_max: 0,
            rq_oti: '',
            rq_ids: '',
            rawData: '',
            key: ticket.ticket.key,
            label: '',
            storage_fee: ticket.tx_info.multisig_tx_total_fee,
            status,
            timestamp: ticket?.ticket?.timestamp || Date.now(),
            sub_type: contractTicket.sub_type,
            tx_info: JSON.stringify(ticket.tx_info),
            sha3_256_hash_of_original_file:
              contractTicket.sha3_256_hash_of_original_file,
            volumes: JSON.stringify(contractTicket.volumes),
            files: files ? JSON.stringify(files) : null,
          });
          await ticketService.updateDetailIdForTicket(
            transactionId,
            transactionId,
          );
          if (cascadeMultiVolumeStatus?.app_pastelid) {
            await ticketService.updatePastelIDForTicket(
              transactionId,
              cascadeMultiVolumeStatus.app_pastelid,
            );
          }
          await createCascadeRawDataFile(transactionId, JSON.stringify(ticket));
        }
      } catch (error) {
        await cascadeService.save({
          transactionHash: transactionId,
          blockHeight,
          transactionTime,
          fileName: '',
          fileType: '',
          fileSize: 0,
          dataHash: '',
          make_publicly_accessible: '',
          pastelId: '',
          rq_ic: 0,
          rq_max: 0,
          rq_oti: '',
          rq_ids: '',
          rawData: JSON.stringify({ ticket: tickets }),
          key: '',
          label: '',
          storage_fee: 0,
          status,
          timestamp: Date.now(),
          sub_type: null,
          tx_info: null,
          sha3_256_hash_of_original_file: null,
          volumes: null,
        });
        await createCascadeRawDataFile(
          transactionId,
          JSON.stringify({ ticket: tickets }),
        );
        console.error(
          `Updated cascade (txid: ${transactionId}) error >>> ${getDateErrorFormat()} >>>`,
          error.message,
        );
      }
    }
  } catch (error) {
    console.error(
      `Updated cascade (txid: ${transactionId}) error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
  }
}
