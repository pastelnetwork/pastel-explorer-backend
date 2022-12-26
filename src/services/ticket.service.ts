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
        .select('*')
        .where('transactionHash = :txId', { txId })
        .getRawMany();

      return items.length
        ? items.map(item => ({
            data: {
              ticket: JSON.parse(item.rawData),
              id: item.id,
            },
            type: item.type,
            transactionHash: item.transactionHash,
            id: item.id,
          }))
        : null;
    } catch {
      return null;
    }
  }

  async getTicketsInBlock(height: string) {
    try {
      const items = await this.getRepository()
        .createQueryBuilder()
        .select('*')
        .where('height = :height', { height })
        .getRawMany();
      return items.length
        ? items.map(item => ({
            data: {
              ticket: JSON.parse(item.rawData),
            },
            type: item.type,
            transactionHash: item.transactionHash,
            id: item.id,
          }))
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
    let sqlWhere = null;
    if (type !== 'all') {
      sqlWhere = `pid.type = '${type}'`;
    }
    const items = await this.getRepository()
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
      .andWhere(sqlWhere)
      .limit(limit)
      .offset(offset)
      .orderBy('pid.timestamp', 'DESC')
      .getRawMany();
    return items.length
      ? items.map(item => ({
          data: {
            ticket: JSON.parse(item.rawData),
          },
          type: item.type,
          transactionHash: item.transactionHash,
          id: item.id,
          imageFileHash: item.imageFileHash,
        }))
      : null;
  }

  async countTotalTicketByPastelId(pastelId: string, type: string) {
    let sqlWhere = null;
    if (type !== 'all') {
      sqlWhere = `type = '${type}'`;
    }
    const result = await this.getRepository()
      .createQueryBuilder()
      .select('COUNT(1) as total')
      .where('pastelID = :pastelId', { pastelId })
      .andWhere(sqlWhere)
      .getRawOne();
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
}

export default new TicketService();
