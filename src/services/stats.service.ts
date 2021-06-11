import { getRepository, MoreThanOrEqual, Repository } from 'typeorm';

import { StatsEntity } from '../entity/stats.entity';

class StatsService {
  private getRepository(): Repository<StatsEntity> {
    return getRepository(StatsEntity);
  }
  async getLatest(): Promise<StatsEntity | null> {
    const items = await this.getRepository().find({
      order: { timestamp: 'DESC' },
      take: 1,
    });
    return items.length === 1 ? items[0] : null;
  }

  async getDayAgo(): Promise<StatsEntity | null> {
    const lastDayTimestamp = Date.now() - 1000 * 60 * 60 * 24;
    const items = await this.getRepository().find({
      order: { timestamp: 'ASC' },
      where: {
        timestamp: MoreThanOrEqual(lastDayTimestamp),
      },
      take: 1,
    });
    return items.length === 1 ? items[0] : null;
  }
  // async getStats(): Promise<StatsEntity | null> {
  //   const items = await this.getRepository().
  // }
  async getAll(
    offset: number,
    limit: number,
    orderBy: keyof StatsEntity,
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

export default new StatsService();
