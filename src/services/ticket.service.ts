import { getRepository, Repository } from 'typeorm';

import { TicketEntity } from '../entity/ticket.entity';

class TicketService {
  private getRepository(): Repository<TicketEntity> {
    return getRepository(TicketEntity);
  }

  async getTicketById(txId: string) {
    try {
      const item = await this.getRepository()
        .createQueryBuilder()
        .select('*')
        .where('transactionHash = :txId', { txId })
        .getRawOne();

      return item
        ? {
            data: {
              ticket: JSON.parse(item.rawData),
            },
            type: item.type,
          }
        : null;
    } catch {
      return null;
    }
  }
}

export default new TicketService();
