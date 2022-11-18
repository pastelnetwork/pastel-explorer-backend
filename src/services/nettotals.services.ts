import { Between, getRepository, Repository } from 'typeorm';

import { NettotalsEntity } from '../entity/nettotals.entity';
import { periodGroupByHourly } from '../utils/constants';
import { generatePrevTimestamp } from '../utils/helpers';
import { TPeriod } from '../utils/period';
import { getChartData } from './chartData.service';

class StatsNetTotalsService {
  private getRepository(): Repository<NettotalsEntity> {
    return getRepository(NettotalsEntity);
  }
  async getLatest(): Promise<NettotalsEntity | null> {
    const items = await this.getRepository().find({
      order: { timestamp: 'DESC' },
      take: 1,
    });
    return items.length === 1 ? items[0] : null;
  }

  async getAll(
    offset: number,
    limit: number,
    orderBy: keyof NettotalsEntity,
    orderDirection: 'DESC' | 'ASC',
    period: TPeriod,
    startTime?: number,
  ) {
    return getChartData<NettotalsEntity>({
      offset,
      limit,
      orderBy,
      orderDirection,
      period,
      repository: this.getRepository(),
      isGroupBy: periodGroupByHourly.includes(period) ? true : false,
      select: periodGroupByHourly.includes(period)
        ? 'id, timemillis, timestamp, MAX(totalbytesrecv) AS totalbytesrecv, MAX(totalbytessent) AS totalbytessent'
        : '*',
      startTime,
    });
  }

  async getLastData(period: TPeriod) {
    const items = await this.getRepository().find({
      order: { timestamp: 'DESC' },
      take: 1,
    });
    const target = generatePrevTimestamp(items[0].timestamp, period);
    let groupBy = '';
    if (periodGroupByHourly.includes(period)) {
      groupBy =
        "strftime('%H %m/%d/%Y', datetime(timestamp / 1000, 'unixepoch'))";
    }

    return await this.getRepository()
      .createQueryBuilder()
      .select(
        periodGroupByHourly.includes(period)
          ? 'id, timemillis, timestamp, MAX(totalbytesrecv) AS totalbytesrecv, MAX(totalbytessent) AS totalbytessent'
          : '*',
      )
      .where({
        timestamp: Between(target, items[0].timestamp),
      })
      .groupBy(groupBy)
      .orderBy('timestamp', 'ASC')
      .getRawMany();
  }
}

export default new StatsNetTotalsService();
