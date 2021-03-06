import { getRepository, Repository } from 'typeorm';

import { NettotalsEntity } from '../entity/nettotals.entity';
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
  ) {
    return getChartData<NettotalsEntity>({
      offset,
      limit,
      orderBy,
      orderDirection,
      period,
      repository: this.getRepository(),
    });
  }
}

export default new StatsNetTotalsService();
