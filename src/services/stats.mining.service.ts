import { getRepository, Repository } from 'typeorm';

import { MiningInfoEntity } from '../entity/mininginfo.entity';

class StatsMiningService {
  private getRepository(): Repository<MiningInfoEntity> {
    return getRepository(MiningInfoEntity);
  }
  async getLatest(): Promise<MiningInfoEntity | null> {
    const items = await this.getRepository().find({
      order: { timestamp: 'DESC' },
      take: 1,
    });
    return items.length === 1 ? items[0] : null;
  }

  async getAll(
    offset: number,
    limit: number,
    orderBy: keyof MiningInfoEntity,
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
