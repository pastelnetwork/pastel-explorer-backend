import dayjs, { ManipulateType } from 'dayjs';
import { getRepository, Repository } from 'typeorm';

import { SenseRequestsEntity } from '../entity/senserequests.entity';
import { TicketEntity } from '../entity/ticket.entity';
import { calculateDifference, getSqlByCondition } from '../utils/helpers';
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
    const result = await this.getRepository()
      .createQueryBuilder()
      .select('COUNT(1) as total')
      .where(sqlWhere)
      .andWhere(timeSqlWhere)
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
    let timeSqlWhere = 'pid.transactionTime > 0';
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
        .where(timeSqlWhere)
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
        .where(timeSqlWhere)
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

    if (status === 'all') {
      const result = await this.getRepository()
        .createQueryBuilder()
        .select('COUNT(1) as total')
        .where(sqlWhere)
        .andWhere(timeSqlWhere)
        .getRawOne();

      return result?.total || 0;
    }

    const tickets = await this.getRepository()
      .createQueryBuilder()
      .select('transactionHash, ticketId')
      .where(sqlWhere)
      .andWhere(timeSqlWhere)
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
    let items = await this.getRepository()
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
      const lastSenseFile = await this.getRepository()
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

        items = await this.getRepository()
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
    if (isAllData) {
      const currentTotalDataStored = await this.getRepository()
        .createQueryBuilder()
        .select('COUNT(1) as total')
        .andWhere("type = 'action-reg'")
        .andWhere('rawData LIKE :type', { type: `%"action_type":"${type}"%` })
        .getRawOne();

      return {
        difference: currentTotalDataStored.total ? '100.00' : '0.00',
        total: currentTotalDataStored.total,
      };
    } else {
      const currentTotalDataStored = await this.getRepository()
        .createQueryBuilder()
        .select('COUNT(1) as total')
        .where(
          `transactionTime >= ${currentStartDate} AND transactionTime <= ${currentEndDate}`,
        )
        .andWhere("type = 'action-reg'")
        .andWhere('rawData LIKE :type', { type: `%"action_type":"${type}"%` })
        .getRawOne();
      const lastDayTotalDataStored = await this.getRepository()
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
          currentTotalDataStored.total,
          lastDayTotalDataStored?.total || 0,
        ),
        total: currentTotalDataStored.total,
      };
    }
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
