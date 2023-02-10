import { getRepository, Repository } from 'typeorm';

import { SenseRequestsEntity } from '../entity/senserequests.entity';
import { TicketEntity } from '../entity/ticket.entity';
import { getStartPoint, TPeriod } from '../utils/period';

class TicketService {
  private getRepository(): Repository<TicketEntity> {
    return getRepository(TicketEntity);
  }

  async getTicketsByTxId(txId: string) {
    try {
      const items = await this.getRepository()
        .createQueryBuilder()
        .select('id, type, transactionHash, rawData, transactionTime')
        .where('transactionHash = :txId', { txId })
        .getRawMany();

      const relatedItems = await this.getRepository()
        .createQueryBuilder()
        .select('type, ticketId')
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
                    id: item.id,
                    transactionTime: item.transactionTime,
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
        .select('id, type, rawData, transactionHash, transactionTime')
        .where('height = :height', { height })
        .getRawMany();

      const relatedItems = await this.getRepository()
        .createQueryBuilder()
        .select('type, ticketId')
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
                    transactionTime: item.transactionTime,
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
                  transactionTime: item.transactionTime,
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

  async countTotalTicketsByType(type: string, period?: TPeriod) {
    let sqlWhere = `type = '${type}'`;
    if (['cascade', 'sense'].includes(type)) {
      sqlWhere = `type = 'action-reg' AND rawData LIKE '%"action_type":"${type}"%'`;
    } else if (type === 'other') {
      sqlWhere = "type NOT IN ('action-reg', 'pastelid')";
    }
    const from = period ? getStartPoint(period) : 0;

    const result = await this.getRepository()
      .createQueryBuilder()
      .select('COUNT(1) as total')
      .where(sqlWhere)
      .andWhere('transactionTime >= :from', { from })
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
    period: TPeriod,
    status: string,
  ) {
    let items = [];
    let relatedItems = [];
    const from = period ? getStartPoint(period) : 0;
    if (type !== 'all') {
      let sqlWhere = `type = '${type}'`;
      if (['cascade', 'sense'].includes(type)) {
        sqlWhere = `type = 'action-reg' AND rawData LIKE '%"action_type":"${type}"%'`;
      } else if (type === 'other') {
        sqlWhere = "type NOT IN ('action-reg', 'pastelid')";
      }
      let sqlStatusWhere =
        "pid.transactionHash IN (SELECT ticketId FROM TicketEntity WHERE type = 'action-act')";
      if (status === 'inactivated') {
        sqlStatusWhere =
          "pid.transactionHash NOT IN (SELECT ticketId FROM TicketEntity WHERE type = 'action-act')";
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
                  transactionTime: item.transactionTime,
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
    period?: TPeriod,
  ) {
    const sqlWhere = `type = 'action-reg' AND rawData LIKE '%"action_type":"${type}"%'`;
    const from = period ? getStartPoint(period) : 0;

    if (status === 'all') {
      const result = await this.getRepository()
        .createQueryBuilder()
        .select('COUNT(1) as total')
        .where(sqlWhere)
        .andWhere('transactionTime >= :from', { from })
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
}

export default new TicketService();
