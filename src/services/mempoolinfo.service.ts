import { Between, getRepository, Repository } from 'typeorm';

import { MempoolInfoEntity } from '../entity/mempoolinfo.entity';
import { periodGroupByHourly } from '../utils/constants';
import { generatePrevTimestamp } from '../utils/helpers';
import { TPeriod } from '../utils/period';
import { getChartData } from './chartData.service';

class StatsMempoolInfoService {
  private getRepository(): Repository<MempoolInfoEntity> {
    return getRepository(MempoolInfoEntity);
  }
  async getLatest(): Promise<MempoolInfoEntity | null> {
    const items = await this.getRepository().find({
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
    return getChartData<MempoolInfoEntity>({
      offset,
      limit,
      orderBy,
      orderDirection,
      period,
      repository: this.getRepository(),
      isMicroseconds: true,
      isGroupBy: periodGroupByHourly.includes(period) ? true : false,
      select: periodGroupByHourly.includes(period)
        ? 'id, bytes, size, timestamp, MAX(usage) AS usage'
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
      .select('*')
      .where({
        timestamp: Between(target, items[0].timestamp),
      })
      .groupBy(groupBy)
      .orderBy('timestamp', 'ASC')
      .getRawMany();
  }
}

export default new StatsMempoolInfoService();
