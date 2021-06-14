import { getRepository, Repository } from 'typeorm';

import { RawMemPoolInfoEntity } from '../entity/rawmempoolinfo.entity';

class StatsMiningService {
  private getRepository(): Repository<RawMemPoolInfoEntity> {
    return getRepository(RawMemPoolInfoEntity);
  }
  async getLatest(): Promise<RawMemPoolInfoEntity | null> {
    const items = await this.getRepository().find({
      order: { timestamp: 'DESC' },
      take: 1,
    });
    return items.length === 1 ? items[0] : null;
  }

  async getAll(
    offset: number,
    limit: number,
    orderBy: keyof RawMemPoolInfoEntity,
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

export default new StatsMiningService();
