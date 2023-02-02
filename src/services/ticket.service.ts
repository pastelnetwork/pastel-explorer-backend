import { getRepository, Repository } from 'typeorm';

import { SenseRequestsEntity } from '../entity/senserequests.entity';
import { TicketEntity } from '../entity/ticket.entity';

class TicketService {
  private getRepository(): Repository<TicketEntity> {
    return getRepository(TicketEntity);
  }

  async getTicketsByTxId(txId: string) {
    try {
      const items = await this.getRepository()
        .createQueryBuilder()
        .select('id, type, transactionHash, rawData')
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
              console.log(activationTicket, item.transactionHash);
              return {
                data: {
                  ticket: {
                    ...JSON.parse(item.rawData).ticket,
                    activation_ticket: activationTicket?.type || null,
                    id: item.id,
                  },
                },
                type: item.type,
                transactionHash: item.transactionHash,
                id: item.id,
              };
            }

            return {
              data: {
                ticket: JSON.parse(item.rawData).ticket,
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
        .select('id, type, rawData, transactionHash')
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
                  },
                },
                type: item.type,
                transactionHash: item.transactionHash,
                id: item.id,
              };
            }

            return {
              data: {
                ticket: JSON.parse(item.rawData).ticket,
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
        .orderBy('pid.timestamp', 'DESC')
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
        .orderBy('pid.timestamp', 'DESC')
        .getRawMany();
    }
    return items.length
      ? items.map(item => {
          if (item.type === 'action-reg') {
            const activationTicket = items.find(
              i =>
                i.type === 'action-act' && i.ticketId === item.transactionHash,
            );
            return {
              data: {
                ticket: {
                  ...JSON.parse(item.rawData).ticket,
                  activation_ticket: activationTicket?.type || null,
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
              ticket: JSON.parse(item.rawData).ticket,
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
        .andWhere('pid.type = :type', { type })
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
      .orderBy('type')
      .getRawMany();
  }

  async deleteTicketByBlockHeight(blockHeight: number) {
    return await this.getRepository().delete({ height: blockHeight });
  }
}

export default new TicketService();
