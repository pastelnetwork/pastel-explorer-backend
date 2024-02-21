import { Between } from 'typeorm';

import { dataSource } from '../datasource';
import { MempoolInfoEntity } from '../entity/mempoolinfo.entity';
import { periodGroupByHourly } from '../utils/constants';
import { generatePrevTimestamp } from '../utils/helpers';
import { TPeriod } from '../utils/period';
import { getChartData } from './chartData.service';

class StatsMempoolInfoService {
  private async getRepository() {
    const service = await dataSource;
    return service.getRepository(MempoolInfoEntity);
  }
  async getLatest(): Promise<MempoolInfoEntity | null> {
    const service = await this.getRepository();
    const items = await service.find({
      order: { timestamp: 'DESC' },
      take: 1,
    });
    return items.length === 1 ? items[0] : null;
  }

  async getAll(
    offset: number,
    limit: number,
    orderBy: keyof MempoolInfoEntity,
    orderDirection: 'DESC' | 'ASC',
    period: TPeriod,
    startTime?: number,
  ) {
    const service = await this.getRepository();
    return getChartData<MempoolInfoEntity>({
      offset,
      limit,
      orderBy,
      orderDirection,
      period,
      repository: service,
      isMicroseconds: true,
      isGroupBy: periodGroupByHourly.includes(period) ? true : false,
      select: periodGroupByHourly.includes(period)
        ? 'id, bytes, size, timestamp, MAX(usage) AS usage'
        : '*',
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
      .select('*')
      .where({
        timestamp: Between(target, items[0].timestamp),
      })
      .groupBy(groupBy)
      .orderBy('timestamp', 'ASC')
      .getRawMany();
  }

  async getAllForHistoricalStatistics(
    offset: number,
    limit: number,
    orderBy: keyof MempoolInfoEntity,
    orderDirection: 'DESC' | 'ASC',
    period: TPeriod,
  ) {
    const service = await this.getRepository();
    return getChartData<MempoolInfoEntity>({
      offset,
      limit,
      orderBy,
      orderDirection,
      period,
      repository: service,
      isMicroseconds: true,
      isGroupBy: periodGroupByHourly.includes(period) ? true : false,
      select: periodGroupByHourly.includes(period)
        ? 'timestamp, MAX(usage) AS usage'
        : 'timestamp, usage',
    });
  }
}

export default new StatsMempoolInfoService();
