import { getRepository, Repository } from 'typeorm';

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
}

export default new TicketService();
