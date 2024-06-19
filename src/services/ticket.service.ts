import dayjs, { ManipulateType } from 'dayjs';
import { decode } from 'js-base64';

import { dataSource } from '../datasource';
import { SenseRequestsEntity } from '../entity/senserequests.entity';
import { TicketEntity } from '../entity/ticket.entity';
import { TransactionEntity } from '../entity/transaction.entity';
import * as ascii85 from '../utils/ascii85';
import { calculateDifference, getSqlByCondition } from '../utils/helpers';
import { TPeriod } from '../utils/period';
import nftService from './nft.service';
import senserequestsService from './senserequests.service';

class TicketService {
  private async getRepository() {
    const service = await dataSource;
    return service.getRepository(TicketEntity);
  }

  async getTicketsByTxId(txId: string) {
    try {
      const service = await this.getRepository();
      const items = await service
        .createQueryBuilder()
        .select(
          'type, transactionHash, rawData, transactionTime, height, otherData, ticketId',
        )
        .where('transactionHash = :txId', { txId })
        .getRawMany();

      const relatedItems = await service
        .createQueryBuilder()
        .select(
          'type, transactionHash, rawData, transactionTime, height, ticketId',
        )
        .where('ticketId = :txId', { txId })
        .getRawMany();

      const txIds = items.map(i => i.transactionHash);
      let nfts = null;
      if (txIds.length) {
        nfts = await nftService.getNftForCollectionByTxIds(txIds);
      }
      const ticketIds = items.map(i => i.ticketId);
      let offerNfts = null;
      let offerSense = null;
      if (ticketIds.length) {
        offerNfts = await nftService.getNftThumbnailByTxIds(ticketIds);
        offerSense =
          await senserequestsService.getSenseForCollectionByTxIds(ticketIds);
      }
      const ids = items.map(i => i.ticketId);
      const ticketTypes = await this.getTicketTypeByTxID(ids);

      return items.length
        ? items.map(item => {
            let ticketType = '';
            if (['offer', 'accept', 'transfer'].indexOf(item.type) !== -1) {
              const result = ticketTypes.find(
                t => t.ticketId === item.ticketId,
              );
              ticketType = result?.type || '';
              if (ticketType === 'action-reg') {
                const ticket = JSON.parse(result.rawData).ticket;
                ticketType = ticket.action_type;
              }
            }
            const activationTicket = relatedItems.find(
              i =>
                item.transactionHash !== i.transactionHash &&
                i.ticketId === item.transactionHash,
            );
            const nft = nfts.find(
              nft => nft.transactionHash === item.transactionHash,
            );
            const offerImage = offerNfts.find(
              o => o.transactionHash === item.ticketId,
            );
            const offerSenseImage = offerSense.find(
              o => o.transactionHash === item.ticketId,
            );
            const ticket = JSON.parse(item.rawData).ticket;
            return {
              data: {
                ticket: {
                  ...ticket,
                  contract_ticket: ticket?.contract_ticket
                    ? JSON.parse(decode(ticket.contract_ticket))
                    : undefined,
                  otherData: {
                    ...JSON.parse(item.otherData),
                    ticketType,
                    ticketId: item.ticketId,
                  },
                  activation_ticket: activationTicket?.type || null,
                  activation_txId: activationTicket?.transactionHash || '',
                  image:
                    nft?.preview_thumbnail ||
                    offerImage?.preview_thumbnail ||
                    offerSenseImage?.imageFileCdnUrl ||
                    '',
                  id: item.transactionHash,
                  transactionTime: item.transactionTime,
                  height: item.height,
                  activationTicket: activationTicket?.transactionHash
                    ? {
                        data: {
                          ticket: {
                            ...JSON.parse(activationTicket.rawData).ticket,
                            transactionTime: activationTicket.transactionTime,
                            height: activationTicket.height,
                          },
                          id: activationTicket.id,
                        },
                        type: activationTicket.type,
                        transactionHash: activationTicket.transactionHash,
                        id: activationTicket.id,
                      }
                    : null,
                  nftId: offerImage?.transactionEvents,
                },
              },
              type: item.type,
              transactionHash: item.transactionHash,
              id: item.transactionHash,
            };
          })
        : null;
    } catch {
      return null;
    }
  }

  async getTicketTypeByTxID(txIds: string[]) {
    if (!txIds.length) {
      return [];
    }
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('type, ticketId, rawData')
      .where('ticketId IN (:...txIds)', { txIds })
      .andWhere("type IN ('nft-reg', 'action-reg')")
      .getRawMany();
  }

  async getTicketsInBlock(height: string) {
    try {
      const service = await this.getRepository();
      const items = await service
        .createQueryBuilder()
        .select(
          'type, rawData, transactionHash, transactionTime, height, otherData',
        )
        .where('height = :height', { height })
        .getRawMany();
      const relatedItems = await service
        .createQueryBuilder('t')
        .select(
          't.type, t.transactionHash, t.rawData, t.transactionTime, t.height, t.ticketId',
        )
        .leftJoin(
          query => query.from(TransactionEntity, 'tx').select('id, height'),
          'tx',
          't.ticketId = tx.id',
        )
        .where('tx.height = :height', { height })
        .getRawMany();

      const txIds = items.map(i => i.transactionHash);
      let nfts = null;
      if (txIds.length) {
        nfts = await nftService.getNftForCollectionByTxIds(txIds);
      }

      const ticketIds = items.map(i => i.ticketId);
      let offerNfts = null;
      let offerSense = null;
      if (ticketIds.length) {
        offerNfts = await nftService.getNftThumbnailByTxIds(ticketIds);
        offerSense =
          await senserequestsService.getSenseForCollectionByTxIds(ticketIds);
      }

      return items.length
        ? items.map(item => {
            const activationTicket = relatedItems.find(
              i =>
                i.transactionHash !== item.transactionHash &&
                i.ticketId === item.transactionHash,
            );
            const nft = nfts.find(
              nft => nft.transactionHash === item.transactionHash,
            );
            const offerImage = offerNfts.find(
              o => o.transactionHash === item.ticketId,
            );
            const offerSenseImage = offerSense.find(
              o => o.transactionHash === item.ticketId,
            );
            return {
              data: {
                ticket: {
                  ...JSON.parse(item.rawData).ticket,
                  otherData: JSON.parse(item.otherData),
                  activation_ticket: activationTicket?.type || null,
                  activation_txId: activationTicket?.transactionHash || '',
                  image:
                    nft?.preview_thumbnail ||
                    offerImage?.preview_thumbnail ||
                    offerSenseImage?.imageFileCdnUrl ||
                    '',
                  transactionTime: item.transactionTime,
                  height: item.height,
                  activationTicket: activationTicket?.transactionHash
                    ? {
                        data: {
                          ticket: {
                            ...JSON.parse(activationTicket.rawData).ticket,
                            transactionTime: activationTicket.transactionTime,
                            height: activationTicket.height,
                          },
                          id: activationTicket.id,
                        },
                        type: activationTicket.type,
                        transactionHash: activationTicket.transactionHash,
                        id: activationTicket.id,
                      }
                    : null,
                  nftId: offerImage?.transactionEvents,
                },
              },
              type: item.type,
              transactionHash: item.transactionHash,
              id: item.transactionHash,
            };
          })
        : null;
    } catch {
      return [];
    }
  }

  async getTicketId(txid: string) {
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .select('timestamp')
      .where('transactionHash = :txid', { txid })
      .getRawOne();
  }

  async searchPastelId(searchParam: string) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('pastelID')
      .where('pastelID like :searchParam', {
        searchParam: `%${searchParam}%`,
      })
      .distinct(true)
      .limit(10)
      .getRawMany();
  }

  async getTicketsByPastelId(
    pastelId: string,
    type: string,
    offset: number,
    limit: number,
  ) {
    let items = [];
    let relatedItems = [];
    const service = await this.getRepository();
    if (type !== 'all') {
      items = await service
        .createQueryBuilder('pid')
        .select('pid.*, imageFileHash, imageFileCdnUrl')
        .leftJoin(
          query =>
            query
              .from(SenseRequestsEntity, 's')
              .select('imageFileHash, transactionHash, imageFileCdnUrl'),
          's',
          'pid.transactionHash = s.transactionHash',
        )
        .where('pid.pastelID = :pastelId', { pastelId })
        .andWhere('pid.type = :type', { type })
        .limit(limit)
        .offset(offset)
        .orderBy('pid.transactionTime')
        .getRawMany();

      relatedItems = await service
        .createQueryBuilder('pid')
        .select('pid.*, imageFileHash, imageFileCdnUrl')
        .leftJoin(
          query =>
            query
              .from(SenseRequestsEntity, 's')
              .select('imageFileHash, transactionHash, imageFileCdnUrl'),
          's',
          'pid.transactionHash = s.transactionHash',
        )
        .where('pid.pastelID = :pastelId', { pastelId })
        .orderBy('pid.transactionTime')
        .getRawMany();
    } else {
      items = await service
        .createQueryBuilder('pid')
        .select('pid.*, imageFileHash, imageFileCdnUrl')
        .leftJoin(
          query =>
            query
              .from(SenseRequestsEntity, 's')
              .select('imageFileHash, transactionHash, imageFileCdnUrl'),
          's',
          'pid.transactionHash = s.transactionHash',
        )
        .where('pid.pastelID = :pastelId', { pastelId })
        .limit(limit)
        .offset(offset)
        .orderBy('pid.transactionTime')
        .getRawMany();

      relatedItems = await service
        .createQueryBuilder('pid')
        .select('pid.*, imageFileHash, imageFileCdnUrl')
        .leftJoin(
          query =>
            query
              .from(SenseRequestsEntity, 's')
              .select('imageFileHash, transactionHash, imageFileCdnUrl'),
          's',
          'pid.transactionHash = s.transactionHash',
        )
        .where('pid.pastelID = :pastelId', { pastelId })
        .orderBy('pid.transactionTime')
        .getRawMany();
    }
    const txIds = items.map(i => i.transactionHash);
    let nfts = null;
    if (txIds.length) {
      nfts = await nftService.getNftForCollectionByTxIds(txIds);
    }
    const ticketIds = items.map(i => i.ticketId);
    let offerNfts = null;
    let offerSense = null;
    if (ticketIds.length) {
      offerNfts = await nftService.getNftThumbnailByTxIds(ticketIds);
      offerSense =
        await senserequestsService.getSenseForCollectionByTxIds(ticketIds);
    }
    return items.length
      ? items.map(item => {
          const activationTicket = relatedItems.find(
            i =>
              i.transactionHash !== item.transactionHash &&
              i.ticketId === item.transactionHash,
          );
          const nft = nfts.find(
            nft => nft.transactionHash === item.transactionHash,
          );
          const offerImage = offerNfts.find(
            o => o.transactionHash === item.ticketId,
          );
          const offerSenseImage = offerSense.find(
            o => o.transactionHash === item.ticketId,
          );
          return {
            data: {
              ticket: {
                ...JSON.parse(item.rawData).ticket,
                otherData: JSON.parse(item.otherData),
                activation_ticket: activationTicket?.type || null,
                activation_txId: activationTicket?.transactionHash || '',
                image:
                  nft?.preview_thumbnail ||
                  offerImage?.preview_thumbnail ||
                  offerSenseImage?.imageFileCdnUrl ||
                  '',
                transactionTime: item.transactionTime,
                height: item.height,
                activationTicket: activationTicket?.transactionHash
                  ? {
                      data: {
                        ticket: {
                          ...JSON.parse(activationTicket.rawData).ticket,
                          transactionTime: activationTicket.transactionTime,
                          height: activationTicket.height,
                        },
                        id: activationTicket.id,
                      },
                      type: activationTicket.type,
                      transactionHash: activationTicket.transactionHash,
                      id: activationTicket.id,
                    }
                  : null,
                nftId: offerImage?.transactionEvents,
              },
            },
            type: item.type,
            transactionHash: item.transactionHash,
            id: item.transactionHash,
            imageFileHash: item?.imageFileHash,
            imageFileCdnUrl: item?.imageFileCdnUrl,
          };
        })
      : null;
  }

  async countTotalTicketByPastelId(pastelId: string, type: string) {
    let result = {
      total: 0,
    };
    const service = await this.getRepository();
    if (type !== 'all') {
      result = await service
        .createQueryBuilder()
        .select('COUNT(1) as total')
        .where('pastelID = :pastelId', { pastelId })
        .andWhere('type = :type', { type })
        .getRawOne();
    } else {
      result = await service
        .createQueryBuilder()
        .select('COUNT(1) as total')
        .where('pastelID = :pastelId', { pastelId })
        .getRawOne();
    }
    return result.total;
  }

  async getTotalTypeByPastelId(pastelId: string) {
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .select('type, COUNT(1) as total')
      .where('pastelID = :pastelId', { pastelId })
      .groupBy('type')
      .orderBy(
        `CASE type
        WHEN 'username-change' THEN 0
        WHEN 'pastelid' THEN 1
        WHEN 'collection-reg' THEN 2
        WHEN 'collection-act' THEN 3
        WHEN 'nft-reg' THEN 4
        WHEN 'nft-act' THEN 5
        WHEN 'nft-royalty' THEN 6
        WHEN 'action-reg' THEN 7
        WHEN 'action-act' THEN 8
        WHEN 'offer' THEN 9
        WHEN 'accept' THEN 10
        WHEN 'transfer' THEN 11
      END`,
      )
      .getRawMany();
  }

  async deleteTicketByBlockHeight(blockHeight: number) {
    const service = await this.getRepository();
    return await service.delete({ height: blockHeight });
  }

  async getTicketsByType(type: string, offset: number, limit: number) {
    const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);

    let sqlWhere = `type = '${type}'`;
    let relatedSqlWhere = "type = 'action-act'";
    if (['cascade', 'sense'].includes(type)) {
      sqlWhere = `type = 'action-reg' AND rawData LIKE '%"action_type":"${type}"%'`;
    } else if (type === 'pastelid-usename') {
      sqlWhere = "type IN ('pastelid')";
      relatedSqlWhere = "type IN ('username-change')";
    } else if (type === 'offer-transfer') {
      sqlWhere = "type IN ('offer', 'transfer')";
    } else if (type === 'pastel-nft') {
      sqlWhere = "type IN ('nft-reg')";
      relatedSqlWhere = "type IN ('nft-act')";
    } else if (type === 'other') {
      sqlWhere = "type IN ('collection-reg')";
      relatedSqlWhere = "type IN ('collection-act')";
    } else if (type === 'inference-api') {
      sqlWhere = "type IN ('contract')";
    }
    const service = await this.getRepository();
    const tickets = await service
      .createQueryBuilder()
      .select(
        'type, height, transactionHash, rawData, pastelID, transactionTime, otherData, ticketId',
      )
      .where(sqlWhere)
      .andWhere('height >= :hideToBlock', { hideToBlock })
      .limit(limit)
      .offset(offset)
      .orderBy('transactionTime', 'DESC')
      .getRawMany();
    const relatedItems = await service
      .createQueryBuilder('pid')
      .select('pid.*, imageFileHash')
      .leftJoin(
        query =>
          query
            .from(SenseRequestsEntity, 's')
            .select('imageFileHash, transactionHash'),
        's',
        'pid.transactionHash = s.transactionHash',
      )
      .where(relatedSqlWhere)
      .andWhere('pid.height >= :hideToBlock', { hideToBlock })
      .orderBy('pid.transactionTime')
      .getRawMany();

    const ticketIds = tickets.map(t => t.ticketId);
    let offerNfts = null;
    let offerSense = null;
    if (
      ticketIds.length &&
      (type === 'offer-transfer' || type === 'pastel-nft')
    ) {
      offerNfts = await nftService.getNftThumbnailByTxIds(ticketIds);
      offerSense =
        await senserequestsService.getSenseForCollectionByTxIds(ticketIds);
    }
    const ticketTypes = await this.getTicketTypeByTxID(ticketIds);

    return tickets.map(ticket => {
      const rawData = JSON.parse(ticket.rawData).ticket;
      const otherData = ticket.otherData ? JSON.parse(ticket.otherData) : null;
      const activationTicket = relatedItems.find(
        i => i.ticketId === ticket.transactionHash,
      );
      let fileType = '';
      let fileName = '';
      let fileSize = '';
      const offerImage = offerNfts?.find(
        o => o.transactionHash === ticket.ticketId,
      );
      const offerSenseImage = offerSense?.find(
        o => o.transactionHash === ticket.ticketId,
      );
      try {
        const actionTicket = rawData?.action_ticket;
        if (actionTicket) {
          const decodeApiTicket = ticketData => {
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
          const parseActionTicket = JSON.parse(decode(actionTicket));
          const apiTicket = decodeApiTicket(parseActionTicket.api_ticket);
          fileType = apiTicket?.file_type;
          fileName = apiTicket?.file_name;
          fileSize = apiTicket?.original_file_size_in_bytes;
        }
      } catch {
        fileType = '';
        fileName = '';
        fileSize = '';
      }

      let copyNumber = undefined;
      let ticketType = undefined;
      let reTxId = undefined;
      let userName = undefined;
      if (type === 'offer-transfer') {
        copyNumber =
          ticket.type === 'offer'
            ? rawData?.copy_number
            : ticket.type === 'transfer'
              ? rawData?.copy_serial_nr
              : undefined;
        const result = ticketTypes.find(t => t.ticketId === ticket.ticketId);
        ticketType = result?.type || '';
        if (ticketType === 'action-reg') {
          const ticket = JSON.parse(result.rawData).ticket;
          ticketType = ticket.action_type;
        }
        reTxId = ticket.ticketId;
      }
      if (type === 'pastelid-usename') {
        const users = relatedItems
          .filter(r => r.pastelID === ticket.pastelID)
          .sort((a, b) => b.transactionTime - a.transactionTime);
        if (users.length) {
          const selectedItem = users[users.length - 1];
          const rawData = JSON.parse(selectedItem.rawData).ticket;
          reTxId = selectedItem.transactionHash;
          userName = rawData.username;
        }
      }
      return {
        type: ticket.type,
        transactionHash: ticket.transactionHash,
        pastelID: ticket.pastelID,
        timestamp: ticket.transactionTime,
        fee: rawData?.storage_fee || 0,
        version: rawData?.version || 0,
        id_type: rawData?.id_type || '',
        activation_ticket: activationTicket?.type || null,
        activation_txId: activationTicket?.transactionHash || '',
        collectionName: otherData?.collectionName || '',
        collectionAlias: otherData?.collectionAlias || '',
        fileType,
        image:
          offerImage?.preview_thumbnail ||
          offerSenseImage?.imageFileCdnUrl ||
          '',
        fileName,
        nft_max_count:
          type === 'other' || type === 'collection-reg'
            ? rawData?.collection_ticket?.max_collection_entries
            : undefined,
        nft_copy_count:
          type === 'other' || type === 'collection-reg'
            ? rawData.collection_ticket.collection_item_copy_count
            : undefined,
        item_type:
          type === 'other' || type === 'collection-reg'
            ? rawData.collection_ticket.item_type
            : undefined,
        fileSize: fileSize || undefined,
        copyNumber,
        ticketType,
        reTxId,
        userName,
        nftId: offerImage?.transactionHash,
        contract_ticket:
          type === 'contract' ? rawData.contract_ticket : undefined,
      };
    });
  }

  async countTotalTicketsByType(
    type: string,
    startDate: number,
    endDate?: number | null,
  ) {
    const service = await this.getRepository();
    const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
    let sqlWhere = `type = '${type}'`;
    if (['cascade', 'sense'].includes(type)) {
      sqlWhere = `type = 'action-reg' AND rawData LIKE '%"action_type":"${type}"%'`;
    } else if (type === 'pastelid-usename') {
      sqlWhere = "type IN ('pastelid')";
    } else if (type === 'offer-transfer') {
      sqlWhere = "type IN ('offer', 'transfer')";
    } else if (type === 'pastel-nft') {
      sqlWhere = "type IN ('nft-reg')";
    } else if (type === 'other') {
      sqlWhere = "type IN ('collection-reg')";
    } else if (type === 'inference-api') {
      sqlWhere = "type IN ('contract')";
    }
    let timeSqlWhere = 'transactionTime > 0';
    if (startDate) {
      timeSqlWhere = `transactionTime BETWEEN ${dayjs(startDate)
        .hour(0)
        .minute(0)
        .millisecond(0)
        .valueOf()} AND ${dayjs(startDate)
        .hour(23)
        .minute(59)
        .millisecond(59)
        .valueOf()}`;
      if (endDate) {
        timeSqlWhere = `transactionTime BETWEEN ${new Date(
          startDate,
        ).getTime()} AND ${new Date(endDate).getTime()}`;
      }
    }
    const result = await service
      .createQueryBuilder()
      .select('COUNT(1) as total')
      .where(sqlWhere)
      .andWhere(timeSqlWhere)
      .andWhere('height >= :hideToBlock', { hideToBlock })
      .getRawOne();

    return result?.total || 0;
  }

  async countTotalTicket(type: string) {
    let result = {
      total: 0,
    };
    let sqlWhere = "type NOT IN ('action-reg', 'pastelid')";
    if (['cascade', 'sense'].includes(type)) {
      sqlWhere = `type = 'action-reg' AND rawData LIKE '%"action_type":"${type}"%'`;
    } else if (type === 'pastelid') {
      sqlWhere = "type = 'pastelid'";
    }
    const service = await this.getRepository();
    result = await service
      .createQueryBuilder()
      .select('COUNT(1) as total')
      .andWhere(sqlWhere)
      .getRawOne();
    return result.total;
  }

  async getTicketsType(
    type: string,
    offset: number,
    limit: number,
    status: string,
    startDate: number,
    endDate?: number | null,
    sort = 'pid.transactionTime',
    nftStatus = '',
  ) {
    let items = [];
    let relatedItems = [];
    let timeSqlWhere = 'pid.transactionTime > 0';
    const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
    const service = await this.getRepository();

    if (startDate) {
      timeSqlWhere = `pid.transactionTime BETWEEN ${dayjs(startDate)
        .hour(0)
        .minute(0)
        .millisecond(0)
        .valueOf()} AND ${dayjs(startDate)
        .hour(23)
        .minute(59)
        .millisecond(59)
        .valueOf()}`;
      if (endDate) {
        timeSqlWhere = `pid.transactionTime BETWEEN ${new Date(
          startDate,
        ).getTime()} AND ${new Date(endDate).getTime()}`;
      }
    }

    if (type !== 'all') {
      let sqlWhere = `type = '${type}'`;
      let relatedSqlWhere = "type = 'action-act'";
      if (['cascade', 'sense'].includes(type)) {
        sqlWhere = `type = 'action-reg' AND rawData LIKE '%"action_type":"${type}"%'`;
      } else if (type === 'pastelid-usename') {
        sqlWhere = "type IN ('pastelid')";
      } else if (type === 'offer-transfer') {
        sqlWhere = "type IN ('offer', 'transfer')";
      } else if (type === 'pastel-nft') {
        sqlWhere = "type IN ('nft-reg')";
        relatedSqlWhere = "type IN ('nft-act')";
      } else if (type === 'other') {
        sqlWhere = "type IN ('collection-reg')";
      } else if (type === 'inference-api') {
        sqlWhere = "type IN ('contract')";
      }
      let sqlStatusWhere = 'transactionTime > 0';
      if (status !== 'all') {
        if (['cascade', 'sense'].includes(type)) {
          sqlStatusWhere =
            "pid.transactionHash IN (SELECT ticketId FROM TicketEntity WHERE type = 'action-act')";
          if (status === 'inactivated') {
            sqlStatusWhere =
              "pid.transactionHash NOT IN (SELECT ticketId FROM TicketEntity WHERE type = 'action-act')";
          }
        }
      }
      let sqlNftStatusWhere = 'transactionTime > 0';
      if (nftStatus !== 'all') {
        if (['pastel-nft'].includes(type)) {
          sqlNftStatusWhere =
            "pid.transactionHash IN (SELECT transactionHash FROM NftEntity WHERE make_publicly_accessible LIKE '%1%')";
          if (Number(nftStatus) === 0) {
            sqlNftStatusWhere =
              "pid.transactionHash IN (SELECT transactionHash FROM NftEntity WHERE make_publicly_accessible NOT LIKE '%1%')";
          }
        }
      }

      items = await service
        .createQueryBuilder('pid')
        .select('pid.*, imageFileHash')
        .leftJoin(
          query =>
            query
              .from(SenseRequestsEntity, 's')
              .select('imageFileHash, transactionHash'),
          's',
          'pid.transactionHash = s.transactionHash',
        )
        .where(timeSqlWhere)
        .andWhere(sqlWhere)
        .andWhere(sqlStatusWhere)
        .andWhere(sqlNftStatusWhere)
        .andWhere('height >= :hideToBlock', { hideToBlock })
        .limit(limit)
        .offset(offset)
        .orderBy(sort, 'DESC')
        .getRawMany();

      relatedItems = await service
        .createQueryBuilder('pid')
        .select('pid.*, imageFileHash')
        .leftJoin(
          query =>
            query
              .from(SenseRequestsEntity, 's')
              .select('imageFileHash, transactionHash'),
          's',
          'pid.transactionHash = s.transactionHash',
        )
        .where(relatedSqlWhere)
        .andWhere('pid.height >= :hideToBlock', { hideToBlock })
        .orderBy(sort)
        .getRawMany();
    } else {
      items = await service
        .createQueryBuilder('pid')
        .select('pid.*, imageFileHash')
        .leftJoin(
          query =>
            query
              .from(SenseRequestsEntity, 's')
              .select('imageFileHash, transactionHash'),
          's',
          'pid.transactionHash = s.transactionHash',
        )
        .where(timeSqlWhere)
        .andWhere('pid.height >= :hideToBlock', { hideToBlock })
        .limit(limit)
        .offset(offset)
        .orderBy(sort, 'DESC')
        .getRawMany();

      relatedItems = await service
        .createQueryBuilder('pid')
        .select('pid.*, imageFileHash')
        .leftJoin(
          query =>
            query
              .from(SenseRequestsEntity, 's')
              .select('imageFileHash, transactionHash'),
          's',
          'pid.transactionHash = s.transactionHash',
        )
        .where("type IN ('nft-act', 'collection-act', 'action-act')")
        .andWhere('pid.height >= :hideToBlock', { hideToBlock })
        .orderBy(sort)
        .getRawMany();
    }
    const txIds = items.map(i => i.transactionHash);
    let nfts = null;
    if (txIds.length) {
      nfts = await nftService.getNftForCollectionByTxIds(txIds);
    }
    const ticketIds = items.map(i => i.ticketId);
    let offerNfts = null;
    let offerSense = null;
    if (ticketIds.length) {
      offerNfts = await nftService.getNftThumbnailByTxIds(ticketIds);
      offerSense =
        await senserequestsService.getSenseForCollectionByTxIds(ticketIds);
    }
    return items.length
      ? items.map(item => {
          const otherData = item?.otherData ? JSON.parse(item.otherData) : null;
          const nft = nfts.find(
            nft => nft.transactionHash === item.transactionHash,
          );
          const offerImage = offerNfts.find(
            o => o.transactionHash === item.ticketId,
          );
          const offerSenseImage = offerSense.find(
            o => o.transactionHash === item.ticketId,
          );
          if (
            item.type === 'action-reg' ||
            item.type === 'nft-reg' ||
            item.type === 'collection-reg'
          ) {
            const activationTicket = relatedItems.find(
              i =>
                i.transactionHash !== item.transactionHash &&
                i.ticketId === item.transactionHash,
            );
            return {
              data: {
                ticket: {
                  ...JSON.parse(item.rawData).ticket,
                  otherData: JSON.parse(item.otherData),
                  activation_ticket: activationTicket?.type || null,
                  activation_txId: activationTicket?.transactionHash || '',
                  image:
                    nft?.preview_thumbnail ||
                    offerImage?.preview_thumbnail ||
                    offerSenseImage?.imageFileCdnUrl ||
                    '',
                  transactionTime: item.transactionTime,
                  height: item.height,
                  activationTicket: activationTicket?.transactionHash
                    ? {
                        data: {
                          ticket: {
                            ...JSON.parse(activationTicket.rawData).ticket,
                            transactionTime: activationTicket.transactionTime,
                            height: activationTicket.height,
                          },
                          id: activationTicket.id,
                        },
                        type: activationTicket.type,
                        transactionHash: activationTicket.transactionHash,
                        id: activationTicket.id,
                      }
                    : null,
                  collectionName: otherData?.collectionName || '',
                  collectionAlias: otherData?.collectionAlias || '',
                  nftId: offerImage?.transactionHash || '',
                },
              },
              type: item.type,
              transactionHash: item.transactionHash,
              id: item.transactionHash,
              imageFileHash: item.imageFileHash,
            };
          }

          const ticket = JSON.parse(item.rawData).ticket;
          return {
            data: {
              ticket: {
                ...JSON.parse(item.rawData).ticket,
                contract_ticket: ticket?.contract_ticket
                  ? JSON.parse(decode(ticket.contract_ticket))
                  : undefined,
                otherData: JSON.parse(item.otherData),
                transactionTime: item.transactionTime,
                activation_ticket: null,
                height: item.height,
                collectionName: otherData?.collectionName || '',
                collectionAlias: otherData?.collectionAlias || '',
                image:
                  nft?.preview_thumbnail ||
                  offerImage?.preview_thumbnail ||
                  offerSenseImage?.imageFileCdnUrl ||
                  '',
              },
            },
            type: item.type,
            transactionHash: item.transactionHash,
            id: item.transactionHash,
            imageFileHash: item.imageFileHash,
          };
        })
      : null;
  }

  async getAllSenseTickets() {
    const service = await this.getRepository();
    return await service
      .createQueryBuilder('pid')
      .select('height')
      .where("type = 'action-reg'")
      .andWhere('rawData LIKE \'%"action_type":"sense"%\'')
      .orderBy('pid.transactionTime')
      .getRawMany();
  }

  async countTotalTicketsByStatus(
    type: string,
    status: string,
    startDate: number,
    endDate?: number | null,
    nftStatus = '',
  ) {
    const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
    const service = await this.getRepository();
    const buildSql = service
      .createQueryBuilder()
      .select('transactionHash, ticketId')
      .where('height >= :hideToBlock', { hideToBlock });

    if (type !== 'all') {
      if (['cascade', 'sense'].includes(type)) {
        buildSql.andWhere("type = 'action-reg'");
        buildSql.andWhere('rawData LIKE :type', {
          type: `%"action_type":"${type}"%`,
        });
      } else if (type === 'pastelid-usename') {
        buildSql.andWhere("type IN ('pastelid')");
      } else if (type === 'offer-transfer') {
        buildSql.andWhere("type IN ('offer', 'transfer')");
      } else if (type === 'pastel-nft') {
        buildSql.andWhere("type IN ('nft-reg')");
      } else if (type === 'other') {
        buildSql.andWhere("type IN ('collection-reg')");
      } else if (type === 'inference-api') {
        buildSql.andWhere("type IN ('contract')");
      }
    }

    if (startDate) {
      buildSql.andWhere('transactionTime >= :startDate', {
        startDate: dayjs(startDate).hour(0).minute(0).millisecond(0).valueOf(),
      });
      if (endDate) {
        buildSql.andWhere('transactionTime <= :endDate', {
          endDate: new Date(endDate).getTime(),
        });
      }
    }

    if (status !== 'all') {
      if (['cascade', 'sense'].includes(type)) {
        if (status === 'inactivated') {
          buildSql.andWhere(
            "transactionHash NOT IN (SELECT ticketId FROM TicketEntity WHERE type = 'action-act')",
          );
        } else {
          buildSql.andWhere(
            "transactionHash IN (SELECT ticketId FROM TicketEntity WHERE type = 'action-act')",
          );
        }
      }
    }
    if (nftStatus !== 'all') {
      if (['pastel-nft'].includes(type)) {
        if (nftStatus === '0') {
          buildSql.andWhere(
            "transactionHash NOT IN (SELECT transactionHash FROM CascadeEntity WHERE make_publicly_accessible NOT LIKE '1%')",
          );
        } else {
          buildSql.andWhere(
            "transactionHash IN (SELECT transactionHash FROM CascadeEntity WHERE make_publicly_accessible LIKE '1%')",
          );
        }
      }
    }
    const tickets = await buildSql.getRawMany();
    return tickets.length;
  }

  async getSenseOrCascadeRequest({
    period,
    type,
    startDate,
    endDate,
  }: {
    period: TPeriod;
    type: string;
    startDate: number;
    endDate?: number | null;
  }) {
    let unit: ManipulateType = 'day';
    if (period === '24h') {
      unit = 'hour';
    }
    let currentStartDate = 0;
    let currentEndDate = 0;
    let lastStartDate = 0;
    let lastEndDate = 0;
    let isAllData = false;
    const { groupBy, whereSqlText, duration } = getSqlByCondition({
      period,
      customField: 'transactionTime',
      startDate,
      endDate,
    });
    let lastTime = dayjs().valueOf();
    const service = await this.getRepository();
    let items = await service
      .createQueryBuilder()
      .select('COUNT(1) as value, transactionTime as timestamp')
      .where(whereSqlText)
      .andWhere("type = 'action-reg'")
      .andWhere('rawData LIKE :type', { type: `%"action_type":"${type}"%` })
      .groupBy(groupBy)
      .orderBy('transactionTime', 'ASC')
      .getRawMany();

    if (startDate) {
      const to = endDate ? dayjs(endDate) : dayjs();
      const from = dayjs(startDate);
      const hour = to.diff(from, 'hour');
      const _startDate = dayjs().subtract(hour, 'hour').valueOf();
      currentEndDate = to.valueOf();
      currentStartDate = from.valueOf();
      lastStartDate = _startDate;
      lastEndDate = from.valueOf();
    } else {
      if (period === 'max' || period === 'all') {
        isAllData = true;
      } else {
        currentEndDate = dayjs().valueOf();
        currentStartDate = dayjs().subtract(duration, unit).valueOf();

        lastStartDate = dayjs()
          .subtract(duration * 2, unit)
          .valueOf();
        lastEndDate = dayjs().subtract(duration, unit).valueOf();
      }
    }
    if (!items.length) {
      const lastSenseFile = await service
        .createQueryBuilder()
        .select('transactionTime')
        .andWhere("type = 'action-reg'")
        .andWhere('rawData LIKE :type', { type: `%"action_type":"${type}"%` })
        .orderBy('transactionTime', 'DESC')
        .limit(1)
        .getRawOne();

      if (lastSenseFile?.transactionTime) {
        lastTime = lastSenseFile.transactionTime;
        const to = dayjs(lastSenseFile.transactionTime).valueOf();
        let from = dayjs(lastSenseFile.transactionTime)
          .subtract(duration, unit)
          .valueOf();

        currentEndDate = to;
        currentStartDate = from;
        lastStartDate = dayjs(lastSenseFile.transactionTime)
          .subtract(duration * 2, unit)
          .valueOf();
        lastEndDate = from;

        if (startDate) {
          const hour = dayjs().diff(startDate, 'hour');
          from = dayjs(lastSenseFile.transactionTime)
            .subtract(hour, 'hour')
            .valueOf();

          currentEndDate = lastSenseFile.transactionTime;
          currentStartDate = from;
          lastStartDate = dayjs(lastSenseFile.transactionTime)
            .subtract(hour * 2, unit)
            .valueOf();
          lastEndDate = from;
          if (endDate) {
            const hour = dayjs(endDate).diff(startDate, 'hour');
            from = dayjs(lastSenseFile.transactionTime)
              .subtract(hour, 'hour')
              .valueOf();
            lastStartDate = currentStartDate;
            lastEndDate = from;
          }
        }

        items = await service
          .createQueryBuilder()
          .select('COUNT(1) as value, transactionTime as timestamp')
          .where(`transactionTime >= ${from} AND transactionTime <= ${to}`)
          .andWhere("type = 'action-reg'")
          .andWhere('rawData LIKE :type', { type: `%"action_type":"${type}"%` })
          .groupBy(groupBy)
          .orderBy('transactionTime', 'ASC')
          .getRawMany();
      }
    }
    let newItems = items;
    if (period === '24h' && items.length < 23) {
      newItems = [];
      for (let i = 23; i >= 0; i--) {
        const target = dayjs(lastTime).subtract(i, 'hour');
        const sense = items.find(
          s =>
            dayjs(s.timestamp).format('YYYYMMDDHH') ===
            target.format('YYYYMMDDHH'),
        );
        if (!sense) {
          newItems.push({
            timestamp: target.valueOf(),
            average: 0,
            highest: 0,
          });
        } else {
          newItems.push(sense);
        }
      }
    }
    const data = await this.getDifferenceSenseOrCascade(
      currentStartDate,
      currentEndDate,
      lastStartDate,
      lastEndDate,
      type,
      isAllData,
    );
    return {
      data: newItems,
      difference: data.difference,
      total: data.total,
    };
  }

  async getDifferenceSenseOrCascade(
    currentStartDate: number,
    currentEndDate: number,
    lastStartDate: number,
    lastEndDate: number,
    type: string,
    isAllData: boolean,
  ) {
    const service = await this.getRepository();
    if (isAllData) {
      const currentTotalDataStored = await service
        .createQueryBuilder()
        .select('COUNT(1) as total')
        .andWhere("type = 'action-reg'")
        .andWhere('rawData LIKE :type', { type: `%"action_type":"${type}"%` })
        .getRawOne();

      return {
        difference: currentTotalDataStored?.total ? '100.00' : '0.00',
        total: currentTotalDataStored?.total || 0,
      };
    } else {
      const currentTotalDataStored = await service
        .createQueryBuilder()
        .select('COUNT(1) as total')
        .where(
          `transactionTime >= ${currentStartDate} AND transactionTime <= ${currentEndDate}`,
        )
        .andWhere("type = 'action-reg'")
        .andWhere('rawData LIKE :type', { type: `%"action_type":"${type}"%` })
        .getRawOne();
      const lastDayTotalDataStored = await service
        .createQueryBuilder()
        .select('COUNT(1) as total')
        .where(
          `transactionTime >= ${lastStartDate} AND transactionTime < ${lastEndDate}`,
        )
        .andWhere("type = 'action-reg'")
        .andWhere('rawData LIKE :type', { type: `%"action_type":"${type}"%` })
        .getRawOne();

      return {
        difference: calculateDifference(
          currentTotalDataStored?.total || 0,
          lastDayTotalDataStored?.total || 0,
        ),
        total: currentTotalDataStored?.total || 0,
      };
    }
  }

  async searchByUsername(searchParam: string) {
    const service = await this.getRepository();
    const items = await service
      .createQueryBuilder()
      .select('pastelID, rawData')
      .where('rawData like :searchParam', {
        searchParam: `%${searchParam}%`,
      })
      .andWhere('rawData like :searchParam', {
        searchParam: '%"username"%',
      })
      .andWhere("type = 'username-change'")
      .distinct(true)
      .limit(10)
      .getRawMany();
    return items.map(item => ({
      pastelID: item.pastelID,
      username: JSON.parse(item.rawData)?.ticket?.username,
    }));
  }

  async searchCollectionName(searchParam: string) {
    const service = await this.getRepository();
    const items = await service
      .createQueryBuilder()
      .select('otherData')
      .where('otherData like :searchParam', {
        searchParam: `%${searchParam}%`,
      })
      .andWhere('otherData like :searchParam', {
        searchParam: '%"collectionName"%',
      })
      .distinct(true)
      .limit(10)
      .getRawMany();
    return items.map(item => {
      const otherData = item?.otherData ? JSON.parse(item.otherData) : null;
      return {
        name: otherData?.collectionName || '',
        alias: otherData?.collectionAlias || '',
      };
    });
  }

  async searchCascade(searchParam: string) {
    const service = await this.getRepository();
    const items = await service
      .createQueryBuilder()
      .select('transactionHash, otherData')
      .where('otherData like :searchParam', {
        searchParam: `%${searchParam}%`,
      })
      .andWhere('otherData like :searchParam', {
        searchParam: '%"cascadeFileName"%',
      })
      .distinct(true)
      .limit(10)
      .getRawMany();
    return items.map(item => {
      const otherData = item?.otherData ? JSON.parse(item.otherData) : null;
      return {
        transactionHash: item?.transactionHash || '',
        cascadeFileName: otherData?.cascadeFileName || '',
      };
    });
  }

  async getLatestUsernameForPastelId(pastelId: string) {
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .select('rawData')
      .where("type = 'username-change'")
      .andWhere('pastelID = :pastelId', { pastelId })
      .orderBy('transactionTime', 'DESC')
      .limit(1)
      .getRawOne();
  }

  async getPositionUsernameInDbByPastelId(pastelId: string, username: string) {
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .select('COUNT(1) as position')
      .where("type = 'username-change'")
      .andWhere('pastelID = :pastelId', { pastelId })
      .andWhere(
        "transactionTime < (SELECT transactionTime FROM TicketEntity WHERE type = 'username-change' AND pastelID = :pastelId AND rawData LIKE :username)",
        { pastelId, username: `%"username":"${username}%` },
      )
      .getRawOne();
  }

  async getRegisteredPastelId(pastelId: string) {
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .select('height, rawData')
      .where("type = 'pastelid'")
      .andWhere('pastelID = :pastelId', { pastelId })
      .orderBy('transactionTime')
      .limit(1)
      .getRawOne();
  }

  async getCascadeInfo(transactionHash) {
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .select('rawData, pastelID, ticketId, transactionHash')
      .where("type = 'action-reg'")
      .andWhere('transactionHash = :transactionHash', { transactionHash })
      .getRawOne();
  }

  async getUsernameTicketByPastelId(pastelID: string) {
    const service = await this.getRepository();
    const item = await service
      .createQueryBuilder()
      .select('rawData')
      .where("type = 'username-change'")
      .andWhere('pastelID = :pastelID', { pastelID })
      .orderBy('transactionTime', 'DESC')
      .getRawOne();
    return item?.rawData
      ? JSON.parse(item.rawData)?.ticket?.username || ''
      : null;
  }

  async getCollectionByAlias(alias: string) {
    const service = await this.getRepository();
    const item = await service
      .createQueryBuilder()
      .select('rawData, transactionTime, transactionHash')
      .where('otherData like :searchParam', {
        searchParam: `%"collectionAlias":"${alias}"%`,
      })
      .getRawOne();
    const rawData = item?.rawData ? JSON.parse(item.rawData) : null;
    let username = '';
    if (rawData?.ticket?.collection_ticket?.creator) {
      username = await this.getUsernameTicketByPastelId(
        rawData?.ticket?.collection_ticket?.creator,
      );
    }
    return item?.rawData
      ? {
          item_copy_count:
            rawData?.ticket?.collection_ticket?.collection_item_copy_count,
          name: rawData?.ticket?.collection_ticket?.collection_name,
          version:
            rawData?.ticket?.collection_ticket?.collection_ticket_version,
          creator: rawData?.ticket?.collection_ticket?.creator,
          green: rawData?.ticket?.collection_ticket?.green,
          max_collection_entries:
            rawData?.ticket?.collection_ticket?.max_collection_entries,
          royalty: rawData?.ticket?.collection_ticket?.royalty,
          username,
          transactionTime: item.transactionTime,
          transactionHash: item.transactionHash,
        }
      : null;
  }

  async getTransactionTimeByPastelId(pastelId: string) {
    const service = await this.getRepository();
    const item = await service
      .createQueryBuilder()
      .select('transactionTime')
      .where('pastelID = :pastelId', { pastelId })
      .andWhere("type = 'pastelid'")
      .getRawOne();

    return item?.transactionTime || 0;
  }

  async getItemActivityForNFTDetails(
    txId: string,
    offset: number,
    limit: number,
    type: string,
  ) {
    const service = await this.getRepository();
    const buildSql = service
      .createQueryBuilder()
      .select('rawData, transactionTime, transactionHash')
      .where('ticketId = :txId', { txId })
      .offset(offset)
      .limit(limit)
      .orderBy('transactionTime');
    if (type !== 'all') {
      buildSql.andWhere('type IN (:...type)', { type: type.split(',') });
    }
    return buildSql.getRawMany();
  }

  async countTotalItemActivityForNFTDetails(txId: string, type: string) {
    const service = await this.getRepository();
    const buildSql = service
      .createQueryBuilder()
      .select('count(1) as total')
      .where('ticketId = :txId', { txId });
    if (type !== 'all') {
      buildSql.andWhere('type IN (:...type)', { type: type.split(',') });
    }
    return buildSql.getRawOne();
  }

  async getActionActivationTicketByTxId(txId: string) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('transactionHash')
      .where('ticketId = :txId', { txId })
      .andWhere("type = 'action-act'")
      .getRawOne();
  }

  async getNFTActivationTicketByTxId(txId: string) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('rawData')
      .where('ticketId = :txId', { txId })
      .andWhere("type = 'nft-act'")
      .getRawOne();
  }

  async getCollectionItems(
    collectionId: string,
    offset: number,
    limit: number,
  ) {
    const service = await this.getRepository();
    const tickets = await service
      .createQueryBuilder()
      .select('transactionHash')
      .where('otherData like :searchParam', {
        searchParam: `%"collectionAlias":"${collectionId}"%`,
      })
      .andWhere("(type = 'nft-reg' OR type = 'nft-reg')")
      .andWhere('otherData like :searchParam', {
        searchParam: '%"status":"activated"%',
      })
      .orderBy('transactionTime', 'DESC')
      .offset(offset || 0)
      .limit(limit || 10)
      .getRawMany();

    const txIds = tickets.map(ticket => ticket.transactionHash);
    const items = [];
    if (txIds.length) {
      const senses =
        await senserequestsService.getSenseForCollectionByTxIds(txIds);
      for (let i = 0; i < senses.length; i++) {
        items.push({
          title: senses[i].imageFileHash,
          image: senses[i].imageFileCdnUrl,
          transactionHash: senses[i].transactionHash,
          transactionTime: senses[i].transactionTime,
          type: 'sense',
        });
      }
      const nfts = await nftService.getNftForCollectionByTxIds(txIds);
      for (let i = 0; i < nfts.length; i++) {
        items.push({
          title: senses[i].nft_title,
          image: senses[i].preview_thumbnail,
          transactionHash: senses[i].transactionHash,
          transactionTime: senses[i].transactionTime,
          type: 'sense',
        });
      }
    }
    return items.sort((a, b) => b.transactionTime - a.transactionTime);
  }

  async countTotalCollectionItems(collectionId: string) {
    const service = await this.getRepository();
    const item = await service
      .createQueryBuilder()
      .select('count(1) as total')
      .where('otherData like :searchParam', {
        searchParam: `%"collectionAlias":"${collectionId}"%`,
      })
      .andWhere('otherData like :searchParam', {
        searchParam: '%"status":"activated"%',
      })
      .andWhere("(type = 'nft-reg' OR type = 'nft-reg')")
      .getRawOne();

    return item?.total || 0;
  }

  async getRelatedItems(collectionId: string, txId: string, limit: number) {
    const service = await this.getRepository();
    const tickets = await service
      .createQueryBuilder()
      .select('transactionHash')
      .where('otherData like :searchParam', {
        searchParam: `%"collectionAlias":"${collectionId}"%`,
      })
      .andWhere("(type = 'nft-reg' OR type = 'nft-reg')")
      .andWhere('transactionHash != :txId', { txId })
      .andWhere('otherData like :searchParam', {
        searchParam: '%"status":"activated"%',
      })
      .orderBy('transactionTime', 'DESC')
      .limit(limit || 10)
      .getRawMany();

    const txIds = tickets.map(ticket => ticket.transactionHash);
    const items = [];
    if (txIds.length) {
      const senses =
        await senserequestsService.getSenseForCollectionByTxIds(txIds);
      for (let i = 0; i < senses.length; i++) {
        items.push({
          title: senses[i].imageFileHash,
          image: senses[i].imageFileCdnUrl,
          transactionHash: senses[i].transactionHash,
          transactionTime: senses[i].transactionTime,
          type: 'sense',
        });
      }
      const nfts = await nftService.getNftForCollectionByTxIds(txIds);
      for (let i = 0; i < nfts.length; i++) {
        items.push({
          title: senses[i].nft_title,
          image: senses[i].preview_thumbnail,
          transactionHash: senses[i].transactionHash,
          transactionTime: senses[i].transactionTime,
          type: 'sense',
        });
      }
    }
    return items.sort((a, b) => b.transactionTime - a.transactionTime);
  }

  async updateStatusForTicket(txId: string, type: string) {
    if (!txId || !type) {
      return false;
    }
    try {
      const service = await this.getRepository();
      const item = await service
        .createQueryBuilder()
        .select('otherData')
        .where('transactionHash = :txId', { txId })
        .andWhere('type = :type', { type })
        .getRawOne();
      if (item) {
        const otherData = JSON.parse(item.otherData);
        await service
          .createQueryBuilder()
          .update({
            otherData: JSON.stringify({
              ...otherData,
              status: 'activated',
            }),
          })
          .where('transactionHash = :txId', { txId })
          .execute();
      }
      return true;
    } catch (error) {
      console.log('updateStatusForTicket: error', error);
      return false;
    }
  }

  async getOffers(txId: string, offset: number, limit: number) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('rawData, transactionHash, transactionTime, ticketId, pastelID')
      .where('ticketId = :txId', { txId })
      .andWhere("type = 'offer'")
      .offset(offset)
      .limit(limit)
      .orderBy('transactionTime')
      .getRawMany();
  }

  async countTotalIOffers(txId: string) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('count(1) as total')
      .where('ticketId = :txId', { txId })
      .andWhere("type = 'offer'")
      .getRawOne();
  }

  async getActionActivationTicketByTxIds(txIds: string[]) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('pastelID, transactionHash, ticketId')
      .where('ticketId IN (:...txIds)', { txIds })
      .andWhere("type = 'action-act'")
      .getRawMany();
  }

  async getTransferTicketsByTxIds(txIds: string[]) {
    const service = await this.getRepository();
    const items = await service
      .createQueryBuilder()
      .select('pastelID, rawData, ticketId')
      .where('ticketId IN (:...txIds)', { txIds })
      .andWhere("type = 'transfer'")
      .getRawMany();
    return items.map(i => {
      const ticket = JSON.parse(i.rawData).ticket;
      return {
        pastelID: i.pastelID,
        ticketId: i.ticketId,
        offerTxId: ticket.offer_txid,
      };
    });
  }

  async getLatestTransferTicketsByTxId(txId: string) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('pastelID')
      .where('ticketId = :txId', { txId })
      .andWhere("type = 'transfer'")
      .orderBy('transactionTime', 'DESC')
      .getRawOne();
  }

  async getAllTransferTicketsByTxId(
    txId: string,
    offset: number,
    limit: number,
  ) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('pastelID, rawData, transactionHash, transactionTime')
      .where('ticketId = :txId', { txId })
      .andWhere("type = 'transfer'")
      .orderBy('transactionTime', 'DESC')
      .offset(offset)
      .limit(limit)
      .getRawMany();
  }

  async countTotalTransfers(txId: string) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('count(1) as total')
      .where('ticketId = :txId', { txId })
      .andWhere("type = 'transfer'")
      .getRawOne();
  }

  async getRegIdTicket(txId: string, type = 'action-reg') {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('height, rawData, transactionTime, transactionHash')
      .where('transactionHash = :txId', { txId })
      .andWhere('type = :type', { type })
      .getRawOne();
  }

  async updateDetailIdForTicket(txId: string, detailId: string) {
    if (!txId || !detailId) {
      return false;
    }
    try {
      const service = await this.getRepository();
      await service
        .createQueryBuilder()
        .update({
          detailId,
        })
        .where('transactionHash = :txId', { txId })
        .execute();
      return true;
    } catch (error) {
      console.log('updateDetailIdForTicket: error', error);
      return false;
    }
  }

  async getAllSenseAndNftWithoutData() {
    const service = await this.getRepository();
    const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
    return service
      .createQueryBuilder()
      .select('transactionHash, transactionTime, height, type, rawData')
      .where("type IN ('nft-reg', 'action-reg')")
      .andWhere('detailId IS NULL')
      .andWhere('height >= :hideToBlock', { hideToBlock })
      .orderBy('transactionTime', 'DESC')
      .getRawMany();
  }

  async getActionIdTicket(txId: string, type = 'action-act') {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('height, transactionTime, transactionHash')
      .where('ticketId = :txId', { txId })
      .andWhere('type = :type', { type })
      .getRawOne();
  }

  async deleteAllByTxIds(txIds: string[]) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .delete()
      .where('transactionHash IN (:...txIds)', { txIds })
      .execute();
  }

  async getLatestSenseOrCascadeTicket(type: string) {
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .select('transactionHash, transactionTime, height')
      .where("type = 'action-reg'")
      .andWhere("status = 'check'")
      .andWhere(`rawData LIKE '%"action_type":"${type}"%'`)
      .orderBy('height', 'DESC')
      .getRawOne();
  }

  async getLatestNftTicket() {
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .select('transactionHash, transactionTime, height')
      .where("type = 'nft-reg'")
      .andWhere("status = 'check'")
      .orderBy('height', 'DESC')
      .getRawOne();
  }

  async updateCheckStatusForTicket(transactionHash: string) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .update()
      .set({ status: 'checked' })
      .where('transactionHash = :transactionHash', { transactionHash })
      .execute();
  }
}

export default new TicketService();
