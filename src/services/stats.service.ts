import { getRepository, MoreThanOrEqual, Repository } from 'typeorm';

import { StatsEntity } from '../entity/stats.entity';
import { TPeriod } from '../utils/period';
import { getChartData } from './chartData.service';

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
    period?: TPeriod,
  ) {
    return getChartData<StatsEntity>({
      offset,
      limit,
      orderBy,
      orderDirection,
      period,
      repository: this.getRepository(),
    });
  }
}

export default new StatsService();
