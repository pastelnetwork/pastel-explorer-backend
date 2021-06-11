import { getRepository, Repository } from 'typeorm';

import { PlsPriceEntity } from '../entity/plsprice.entity';

class PlsPriceService {
  private getRepository(): Repository<PlsPriceEntity> {
    return getRepository(PlsPriceEntity);
  }
  async getLatest(): Promise<PlsPriceEntity | null> {
    const items = await this.getRepository().find({
      order: { timestamp: 'DESC' },
      take: 1,
    });
    return items.length === 1 ? items[0] : null;
  }

  async getAll(
    offset: number,
    limit: number,
    orderBy: keyof PlsPriceEntity,
    orderDirection: 'DESC' | 'ASC',
  ) {
    const statsInfo = await this.getRepository().find({
      skip: offset,
      take: limit,
      order: {
        [orderBy]: orderDirection,
      },
    });
    return statsInfo;
  }
}

export default new PlsPriceService();
