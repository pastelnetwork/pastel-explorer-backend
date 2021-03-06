import { getRepository, Repository } from 'typeorm';

import { MiningInfoEntity } from '../entity/mininginfo.entity';
import { getSqlTextByPeriodGranularity } from '../utils/helpers';
import { TGranularity, TPeriod } from '../utils/period';
import { getChartData } from './chartData.service';

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
    period: TPeriod,
  ) {
    return getChartData<MiningInfoEntity>({
      offset,
      limit,
      orderBy,
      orderDirection,
      period,
      repository: this.getRepository(),
    });
  }

  async getMiningCharts(
    sqlQuery: string,
    period: TPeriod,
    orderDirection: 'DESC' | 'ASC',
    granularity?: TGranularity,
  ) {
    const { groupBy, whereSqlText } = getSqlTextByPeriodGranularity(
      period,
      granularity,
      true,
    );
    const groupByText = groupBy.replace('timestamp', 'timestamp/1000');
    return await this.getRepository()
      .createQueryBuilder()
      .select(groupByText, 'label')
      .addSelect(`round(${sqlQuery}, 2)`, 'value')
      .where(whereSqlText)
      .groupBy(groupByText)
      .orderBy('timestamp', orderDirection)
      .getRawMany();
  }
}

export default new StatsMiningService();
