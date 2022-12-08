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
          }))
        : null;
    } catch {
      return null;
    }
  }

  async getTicketsInBlock(blockHeight: string) {
    try {
      const items = await this.getRepository()
        .createQueryBuilder()
        .select('*')
        .where(
          'transactionHash IN (SELECT id FROM `Transaction` WHERE height = :blockHeight) ',
          { blockHeight },
        )
        .getRawMany();
      return items.length
        ? items.map(item => ({
            data: {
              ticket: JSON.parse(item.rawData),
            },
            type: item.type,
            transactionHash: item.transactionHash,
          }))
        : null;
    } catch {
      return 0;
    }
  }
}

export default new TicketService();
