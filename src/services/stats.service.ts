import {
  Between,
  FindManyOptions,
  getRepository,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { StatsEntity } from '../entity/stats.entity';
import { getStartPoint, TPeriod } from '../utils/period';

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
    const query: FindManyOptions<StatsEntity> = {
      // skip: offset,
      // take: limit,
      order: {
        [orderBy]: orderDirection,
      },
    };
    if (period) {
      const fromTime = getStartPoint(period);
      query.where = {
        timestamp: Between(fromTime, new Date().getTime()),
      };
    }
    if (offset) {
      query.skip = offset;
    }
    if (limit) {
      query.take = limit;
    }
    if (limit) {
      const statsInfo = await this.getRepository().find(query);
      return statsInfo;
    }
    const count = await this.getRepository().count(query);
    const take = 500;
    const skip = Math.round(count / take);
    let data = [];
    // get statistics data limit 500 for chart
    if (count <= take || skip < 2) {
      const statsInfo = await this.getRepository().find(query);
      return statsInfo;
    } else {
      let index = 0;
      for (let i = 0; i <= count; i += skip) {
        const item = await this.getRepository().find({
          take: 1,
          skip: skip * index,
        });
        index += 1;
        if (item && item.length) {
          data = data.concat(item);
        }
      }
      return data;
    }
  }
}

export default new StatsService();
