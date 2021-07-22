import { getRepository, Repository } from 'typeorm';

import { NettotalsEntity } from '../entity/nettotals.entity';
import { getLimitQuery } from '../services/common';
import { TPeriod } from '../utils/period';

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
    return getLimitQuery<NettotalsEntity>({
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
