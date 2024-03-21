import { Between } from 'typeorm';

import { dataSource } from '../datasource';
import { NettotalsEntity } from '../entity/nettotals.entity';
import { periodGroupByHourly } from '../utils/constants';
import { generatePrevTimestamp } from '../utils/helpers';
import { TPeriod } from '../utils/period';
import { getChartData } from './chartData.service';

class StatsNetTotalsService {
  private async getRepository() {
    const service = await dataSource;
    return service.getRepository(NettotalsEntity);
  }

  async getAll(
    offset: number,
    limit: number,
    orderBy: keyof NettotalsEntity,
    orderDirection: 'DESC' | 'ASC',
    period: TPeriod,
    startTime?: number,
  ) {
    const service = await this.getRepository();
    return getChartData<NettotalsEntity>({
      offset,
      limit,
      orderBy,
      orderDirection,
      period,
      repository: service,
      isGroupBy: periodGroupByHourly.includes(period) ? true : false,
      select: periodGroupByHourly.includes(period)
        ? 'timemillis, MAX(totalbytesrecv) AS totalbytesrecv, MAX(totalbytessent) AS totalbytessent'
        : 'timemillis, totalbytesrecv, totalbytessent',
      startTime,
    });
  }

  async getLastData(period: TPeriod) {
    const service = await this.getRepository();
    const items = await service.find({
      order: { timestamp: 'DESC' },
      take: 1,
    });
    const target = generatePrevTimestamp(items[0].timestamp, period);
    let groupBy = '';
    if (periodGroupByHourly.includes(period)) {
      groupBy =
        "strftime('%H %m/%d/%Y', datetime(timestamp / 1000, 'unixepoch'))";
    }

    return await service
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
