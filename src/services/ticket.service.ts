import dayjs, { ManipulateType } from 'dayjs';
import { getRepository, Repository } from 'typeorm';

import { SenseRequestsEntity } from '../entity/senserequests.entity';
import { TicketEntity } from '../entity/ticket.entity';
import { getSqlTextForCascadeAndSenseStatisticsByPeriod } from '../utils/helpers';
import { TPeriod } from '../utils/period';

class TicketService {
  private getRepository(): Repository<TicketEntity> {
    return getRepository(TicketEntity);
  }

  async getTicketsByTxId(txId: string) {
    try {
      const items = await this.getRepository()
        .createQueryBuilder()
        .select('id, type, transactionHash, rawData, transactionTime, height')
        .where('transactionHash = :txId', { txId })
        .getRawMany();

      const relatedItems = await this.getRepository()
        .createQueryBuilder()
        .select(
          'id, type, transactionHash, rawData, transactionTime, height, ticketId',
        )
        .where('ticketId = :txId', { txId })
        .getRawMany();

      return items.length
        ? items.map(item => {
            if (item.type === 'action-reg') {
              const activationTicket = relatedItems.find(
                i =>
                  i.type === 'action-act' &&
                  i.ticketId === item.transactionHash,
              );
              return {
                data: {
                  ticket: {
                    ...JSON.parse(item.rawData).ticket,
                    activation_ticket: activationTicket?.type || null,
                    activation_txId: activationTicket?.transactionHash || '',
                    id: item.id,
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
                  },
                },
                type: item.type,
                transactionHash: item.transactionHash,
                id: item.id,
              };
            }

            return {
              data: {
                ticket: {
                  ...JSON.parse(item.rawData).ticket,
                  transactionTime: item.transactionTime,
                  height: item.height,
                },
                id: item.id,
              },
              type: item.type,
              transactionHash: item.transactionHash,
              id: item.id,
            };
          })
        : null;
    } catch {
      return null;
    }
  }

  async getTicketsInBlock(height: string) {
    try {
      const items = await this.getRepository()
        .createQueryBuilder()
        .select('id, type, rawData, transactionHash, transactionTime, height')
        .where('height = :height', { height })
        .getRawMany();

      const relatedItems = await this.getRepository()
        .createQueryBuilder()
        .select(
          'id, type, transactionHash, rawData, transactionTime, height, ticketId',
        )
        .where(
          'ticketId IN (SELECT id FROM `Transaction` WHERE height = :height)',
          { height },
        )
        .getRawMany();
      return items.length
        ? items.map(item => {
            if (item.type === 'action-reg') {
              const activationTicket = relatedItems.find(
                i =>
                  i.type === 'action-act' &&
                  i.ticketId === item.transactionHash,
              );
              return {
                data: {
                  ticket: {
                    ...JSON.parse(item.rawData).ticket,
                    activation_ticket: activationTicket?.type || null,
                    activation_txId: activationTicket?.transactionHash || '',
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
                  },
                },
                type: item.type,
                transactionHash: item.transactionHash,
                id: item.id,
              };
            }

            return {
              data: {
                ticket: {
                  ...JSON.parse(item.rawData).ticket,
                  transactionTime: item.transactionTime,
                  height: item.height,
                },
              },
              type: item.type,
              transactionHash: item.transactionHash,
              id: item.id,
            };
          })
        : null;
    } catch {
      return 0;
    }
  }

  async getTicketId(
    txid: string,
    ticketType: string,
    blockHeight: number,
    rawData: string,
  ) {
    return await this.getRepository()
      .createQueryBuilder()
      .select('id')
      .where('transactionHash = :txid', { txid })
      .andWhere('type = :ticketType', { ticketType })
      .andWhere('height = :blockHeight', { blockHeight })
      .andWhere('rawData = :rawData', { rawData })
      .getRawOne();
  }

  async searchPastelId(searchParam: string) {
    return this.getRepository()
      .createQueryBuilder()
      .select('pastelID')
      .where('pastelID like :searchParam', {
        searchParam: `${searchParam}%`,
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
    if (type !== 'all') {
      items = await this.getRepository()
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
        .where('pid.pastelID = :pastelId', { pastelId })
        .andWhere('pid.type = :type', { type })
        .limit(limit)
        .offset(offset)
        .orderBy('pid.transactionTime')
        .getRawMany();

      relatedItems = await this.getRepository()
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
        .where('pid.pastelID = :pastelId', { pastelId })
        .andWhere('pid.type = :type', { type })
        .orderBy('pid.transactionTime')
        .getRawMany();
    } else {
      items = await this.getRepository()
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
        .where('pid.pastelID = :pastelId', { pastelId })
        .limit(limit)
        .offset(offset)
        .orderBy('pid.transactionTime')
        .getRawMany();

      relatedItems = await this.getRepository()
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
        .where('pid.pastelID = :pastelId', { pastelId })
        .orderBy('pid.transactionTime')
        .getRawMany();
    }
    return items.length
      ? items.map(item => {
          if (item.type === 'action-reg') {
            const activationTicket = relatedItems.find(
              i =>
                i.type === 'action-act' && i.ticketId === item.transactionHash,
            );
            return {
              data: {
                ticket: {
                  ...JSON.parse(item.rawData).ticket,
                  activation_ticket: activationTicket?.type || null,
                  activation_txId: activationTicket?.transactionHash || '',
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
                },
              },
              type: item.type,
              transactionHash: item.transactionHash,
              id: item.id,
              imageFileHash: item?.imageFileHash,
            };
          }

          return {
            data: {
              ticket: {
                ...JSON.parse(item.rawData).ticket,
                transactionTime: item.transactionTime,
                height: item.height,
              },
            },
            type: item.type,
            transactionHash: item.transactionHash,
            id: item.id,
            imageFileHash: item?.imageFileHash,
          };
        })
      : null;
  }

  async countTotalTicketByPastelId(pastelId: string, type: string) {
    let result = {
      total: 0,
    };
    if (type !== 'all') {
      result = await this.getRepository()
        .createQueryBuilder()
        .select('COUNT(1) as total')
        .where('pastelID = :pastelId', { pastelId })
        .andWhere('type = :type', { type })
        .getRawOne();
    } else {
      result = await this.getRepository()
        .createQueryBuilder()
        .select('COUNT(1) as total')
        .where('pastelID = :pastelId', { pastelId })
        .getRawOne();
    }
    return result.total;
  }

  async getTotalTypeByPastelId(pastelId: string) {
    return await this.getRepository()
      .createQueryBuilder()
      .select('type, COUNT(1) as total')
      .where('pastelID = :pastelId', { pastelId })
      .groupBy('type')
      .orderBy(
        `CASE type 
        WHEN 'username-change' THEN 0
        WHEN 'pastelid' THEN 1
        WHEN 'nft-collection-reg' THEN 2
        WHEN 'nft-collection-act' THEN 3
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
    return await this.getRepository().delete({ height: blockHeight });
  }

  async getTicketsByType(type: string, offset: number, limit: number) {
    let sqlWhere = `type = '${type}'`;
    if (['cascade', 'sense'].includes(type)) {
      sqlWhere = `type = 'action-reg' AND rawData LIKE '%"action_type":"${type}"%'`;
    } else if (type === 'other') {
      sqlWhere = "type NOT IN ('action-reg', 'pastelid')";
    }

    const tickets = await this.getRepository()
      .createQueryBuilder()
      .select(
        'type, height, transactionHash, rawData, pastelID, transactionTime',
      )
      .where(sqlWhere)
      .limit(limit)
      .offset(offset)
      .orderBy('transactionTime', 'DESC')
      .getRawMany();
    const relatedItems = await this.getRepository()
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
      .where("type = 'action-act'")
      .orderBy('pid.transactionTime')
      .getRawMany();

    return tickets.map(ticket => {
      const rawData = JSON.parse(ticket.rawData).ticket;
      const activationTicket = relatedItems.find(
        i => i.type === 'action-act' && i.ticketId === ticket.transactionHash,
      );
      return {
        type: ticket.type,
        transactionHash: ticket.transactionHash,
        pastelID: ticket.pastelID,
        timestamp: ticket.transactionTime,
        fee: rawData?.storage_fee || 0,
        version: rawData?.version || 0,
        id_type: rawData?.id_type || '',
        activation_ticket: activationTicket?.type || null,
      };
    });
  }

  async countTotalTicketsByType(
    type: string,
    startDate: number,
    endDate?: number | null,
  ) {
    let sqlWhere = `type = '${type}'`;
    if (['cascade', 'sense'].includes(type)) {
      sqlWhere = `type = 'action-reg' AND rawData LIKE '%"action_type":"${type}"%'`;
    } else if (type === 'other') {
      sqlWhere = "type NOT IN ('action-reg', 'pastelid')";
    }
    const from = startDate ? new Date(startDate).getTime() : 0;
    const to = endDate ? new Date(endDate).getTime() : new Date().getTime();
    const result = await this.getRepository()
      .createQueryBuilder()
      .select('COUNT(1) as total')
      .where(sqlWhere)
      .andWhere('transactionTime >= :from', { from })
      .andWhere('transactionTime <= :to', { to })
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
    result = await this.getRepository()
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
  ) {
    let items = [];
    let relatedItems = [];
    const from = startDate ? new Date(startDate).getTime() : 0;
    const to = endDate ? new Date(endDate).getTime() : new Date().getTime();
    if (type !== 'all') {
      let sqlWhere = `type = '${type}'`;
      let sqlStatusWhere = 'pid.transactionTime > 0';
      if (['cascade', 'sense'].includes(type)) {
        sqlWhere = `type = 'action-reg' AND rawData LIKE '%"action_type":"${type}"%'`;
        sqlStatusWhere =
          "pid.transactionHash IN (SELECT ticketId FROM TicketEntity WHERE type = 'action-act')";
        if (status === 'inactivated') {
          sqlStatusWhere =
            "pid.transactionHash NOT IN (SELECT ticketId FROM TicketEntity WHERE type = 'action-act')";
        }
      } else if (type === 'other') {
        sqlWhere = "type NOT IN ('action-reg', 'pastelid')";
      }
      items = await this.getRepository()
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
        .where('pid.transactionTime >= :from', { from })
        .andWhere('pid.transactionTime <= :to', { to })
        .andWhere(sqlWhere)
        .andWhere(sqlStatusWhere)
        .limit(limit)
        .offset(offset)
        .orderBy('pid.transactionTime', 'DESC')
        .getRawMany();

      relatedItems = await this.getRepository()
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
        .where("type = 'action-act'")
        .orderBy('pid.transactionTime')
        .getRawMany();
    } else {
      items = await this.getRepository()
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
        .where('pid.transactionTime >= :from', { from })
        .limit(limit)
        .offset(offset)
        .orderBy('pid.transactionTime', 'DESC')
        .getRawMany();

      relatedItems = await this.getRepository()
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
        .where("type = 'action-act'")
        .orderBy('pid.transactionTime')
        .getRawMany();
    }

    return items.length
      ? items.map(item => {
          if (item.type === 'action-reg') {
            const activationTicket = relatedItems.find(
              i =>
                i.type === 'action-act' && i.ticketId === item.transactionHash,
            );
            return {
              data: {
                ticket: {
                  ...JSON.parse(item.rawData).ticket,
                  activation_ticket: activationTicket?.type || null,
                  activation_txId: activationTicket?.transactionHash || '',
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
                },
              },
              type: item.type,
              transactionHash: item.transactionHash,
              id: item.id,
              imageFileHash: item.imageFileHash,
            };
          }

          return {
            data: {
              ticket: {
                ...JSON.parse(item.rawData).ticket,
                transactionTime: item.transactionTime,
                activation_ticket: null,
                height: item.height,
              },
            },
            type: item.type,
            transactionHash: item.transactionHash,
            id: item.id,
            imageFileHash: item.imageFileHash,
          };
        })
      : null;
  }

  async getAllSenseTickets() {
    return await this.getRepository()
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
  ) {
    const sqlWhere = `type = 'action-reg' AND rawData LIKE '%"action_type":"${type}"%'`;
    const from = startDate ? new Date(startDate).getTime() : 0;
    const to = endDate ? new Date(endDate).getTime() : new Date().getTime();

    if (status === 'all') {
      const result = await this.getRepository()
        .createQueryBuilder()
        .select('COUNT(1) as total')
        .where(sqlWhere)
        .andWhere('transactionTime >= :from', { from })
        .andWhere('transactionTime <= :to', { to })
        .getRawOne();

      return result?.total || 0;
    }

    const tickets = await this.getRepository()
      .createQueryBuilder()
      .select('transactionHash, ticketId')
      .where(sqlWhere)
      .andWhere('transactionTime >= :from', { from })
      .getRawMany();

    let total = 0;
    if (tickets.length) {
      const ticketId = tickets.map(t => t.ticketId);
      const items = await this.getRepository()
        .createQueryBuilder()
        .select('type, ticketId')
        .where('ticketId IN (:...ticketId)', {
          ticketId,
        })
        .getRawMany();

      tickets.map(t => {
        const activationTicket = items.find(
          i => i.type === 'action-act' && i.ticketId === t.transactionHash,
        );
        if (status === 'activated') {
          if (activationTicket) {
            total += 1;
          }
        } else {
          if (!activationTicket) {
            total += 1;
          }
        }
      });
    }

    return total;
  }

  async getSenseOrCascadeRequest(period: TPeriod, type: string) {
    const { groupBy, whereSqlText } =
      getSqlTextForCascadeAndSenseStatisticsByPeriod(period);
    let items = await this.getRepository()
      .createQueryBuilder()
      .select('COUNT(1) as value, transactionTime as timestamp')
      .where("type = 'action-reg'")
      .andWhere('rawData LIKE :type', { type: `%"action_type":"${type}"%` })
      .andWhere(whereSqlText)
      .groupBy(groupBy)
      .orderBy('transactionTime', 'ASC')
      .getRawMany();
    let lastTime = dayjs().valueOf();
    if (!items.length) {
      const lastTicket = await this.getRepository()
        .createQueryBuilder()
        .select('transactionTime')
        .orderBy('transactionTime', 'DESC')
        .limit(1)
        .getRawOne();
      lastTime = lastTicket?.transactionTime || dayjs().valueOf();
      const { groupBy, whereSqlText } =
        getSqlTextForCascadeAndSenseStatisticsByPeriod(
          period,
          lastTicket?.transactionTime,
        );
      items = await this.getRepository()
        .createQueryBuilder()
        .select('COUNT(1) as value, transactionTime as timestamp')
        .where("type = 'action-reg'")
        .andWhere('rawData LIKE :type', { type: `%"action_type":"${type}"%` })
        .andWhere(whereSqlText)
        .groupBy(groupBy)
        .orderBy('transactionTime', 'ASC')
        .getRawMany();
    }
    let newItems = items;
    if (period === '24h' && items.length < 23) {
      newItems = [];
      for (let i = 24; i > 0; i--) {
        const target = dayjs(lastTime).subtract(i, 'hour');
        const ticket = items.find(
          s =>
            dayjs(s.timestamp).format('YYYYMMDDHH') ===
            target.format('YYYYMMDDHH'),
        );
        if (!ticket) {
          newItems.push({
            timestamp: target.valueOf(),
            value: 0,
          });
        } else {
          newItems.push(ticket);
        }
      }
    }
    return newItems;
  }

  async countTotalSenseOrCascadeRequest(period: TPeriod, type: string) {
    const { whereSqlText, duration } =
      getSqlTextForCascadeAndSenseStatisticsByPeriod(period);
    let item = await this.getRepository()
      .createQueryBuilder()
      .select('COUNT(1) as total')
      .where("type = 'action-reg'")
      .andWhere('rawData LIKE :type', { type: `%"action_type":"${type}"%` })
      .andWhere(whereSqlText)
      .getRawOne();

    if (!item?.total) {
      const lastTicket = await this.getRepository()
        .createQueryBuilder()
        .select('transactionTime')
        .orderBy('transactionTime', 'DESC')
        .limit(1)
        .getRawOne();
      let unit: ManipulateType = 'day';
      if (period === '24h') {
        unit = 'hour';
      }
      const startDate = dayjs(lastTicket?.transactionTime)
        .subtract(duration, unit)
        .valueOf();
      item = await this.getRepository()
        .createQueryBuilder()
        .select('COUNT(1) as total')
        .where("type = 'action-reg'")
        .andWhere('rawData LIKE :type', { type: `%"action_type":"${type}"%` })
        .andWhere('transactionTime >= :startDate', { startDate })
        .getRawOne();
    }
    return item?.total || 0;
  }

  async getDifferenceSenseOrCascade(period: TPeriod, type: string) {
    if (period === 'max' || period === 'all') {
      const currentTickets = await this.getRepository()
        .createQueryBuilder()
        .select('COUNT(1) as total')
        .where("type = 'action-reg'")
        .andWhere('rawData LIKE :type', { type: `%"action_type":"${type}"%` })
        .getRawOne();
      const difference =
        (currentTickets.total / (currentTickets.total / 2)) * 100;
      if (Number.isNaN(difference)) {
        return '0.00';
      }

      return difference.toFixed(2);
    }

    const { duration } = getSqlTextForCascadeAndSenseStatisticsByPeriod(period);
    let unit: ManipulateType = 'day';
    if (period === '24h') {
      unit = 'hour';
    }

    const startDate = dayjs()
      .subtract(duration * 2, unit)
      .valueOf();
    const endDate = dayjs().subtract(duration, unit).valueOf();

    let lastDayTickets = await this.getRepository()
      .createQueryBuilder()
      .select('COUNT(1) as total')
      .where("type = 'action-reg'")
      .andWhere('rawData LIKE :type', { type: `%"action_type":"${type}"%` })
      .andWhere('transactionTime >= :startDate', { startDate })
      .andWhere('transactionTime < :endDate', { endDate })
      .getRawOne();

    const currentDate = dayjs().valueOf();
    let currentTickets = await this.getRepository()
      .createQueryBuilder()
      .select('COUNT(1) as total')
      .where("type = 'action-reg'")
      .andWhere('rawData LIKE :type', { type: `%"action_type":"${type}"%` })
      .andWhere('transactionTime >= :startDate', { startDate: endDate })
      .andWhere('transactionTime <= :endDate', { endDate: currentDate })
      .getRawOne();

    if (!currentTickets?.total) {
      const lastTicket = await this.getRepository()
        .createQueryBuilder()
        .select('transactionTime')
        .orderBy('transactionTime', 'DESC')
        .limit(1)
        .getRawOne();
      const endDate = dayjs(lastTicket?.transactionTime)
        .subtract(duration, unit)
        .valueOf();
      currentTickets = await this.getRepository()
        .createQueryBuilder()
        .select('COUNT(1) as total')
        .where("type = 'action-reg'")
        .andWhere('rawData LIKE :type', { type: `%"action_type":"${type}"%` })
        .andWhere('transactionTime >= :startDate', { startDate: endDate })
        .andWhere('transactionTime <= :endDate', { endDate: currentDate })
        .getRawOne();

      const startDate = dayjs(lastTicket?.transactionTime)
        .subtract(duration * 2, unit)
        .valueOf();
      lastDayTickets = await this.getRepository()
        .createQueryBuilder()
        .select('COUNT(1) as total')
        .where("type = 'action-reg'")
        .andWhere('rawData LIKE :type', { type: `%"action_type":"${type}"%` })
        .andWhere('transactionTime >= :startDate', { startDate })
        .andWhere('transactionTime < :endDate', { endDate })
        .getRawOne();
    }

    const difference =
      ((currentTickets.total - lastDayTickets.total) /
        ((currentTickets.total + lastDayTickets.total) / 2)) *
      100;
    if (Number.isNaN(difference)) {
      return '0.00';
    }
    return difference.toFixed(2);
  }

  async searchByUsername(searchParam: string) {
    const items = await this.getRepository()
      .createQueryBuilder()
      .select('pastelID, rawData')
      .where('rawData like :searchParam', {
        searchParam: `%"username":"${searchParam}%`,
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
  async getLatestUsernameForPastelId(pastelId: string) {
    return await this.getRepository()
      .createQueryBuilder()
      .select('rawData')
      .where("type = 'username-change'")
      .andWhere('pastelID = :pastelId', { pastelId })
      .orderBy('transactionTime', 'DESC')
      .limit(1)
      .getRawOne();
  }

  async getPositionUsernameInDbByPastelId(pastelId: string, username: string) {
    return await this.getRepository()
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
    return await this.getRepository()
      .createQueryBuilder()
      .select('height, rawData')
      .where("type = 'pastelid'")
      .andWhere('pastelID = :pastelId', { pastelId })
      .orderBy('transactionTime')
      .limit(1)
      .getRawOne();
  }
}

export default new TicketService();
