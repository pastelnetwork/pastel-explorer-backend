import { getRepository, Repository } from 'typeorm';

import { RawMemPoolInfoEntity } from '../entity/rawmempoolinfo.entity';
import { getLimitQuery } from '../services/common';
import { TPeriod } from '../utils/period';

class StatsRawMempoolService {
  private getRepository(): Repository<RawMemPoolInfoEntity> {
    return getRepository(RawMemPoolInfoEntity);
  }
  async getLatest(): Promise<RawMemPoolInfoEntity | null> {
    const items = await this.getRepository().find({
      order: { timestamp: 'DESC' },
      take: 1,
    });
    return items.length === 1 ? items[0] : null;
  }

  async getAll(
    offset: number,
    limit: number,
    orderBy: keyof RawMemPoolInfoEntity,
    orderDirection: 'DESC' | 'ASC',
    period: TPeriod,
  ) {
    return getLimitQuery<RawMemPoolInfoEntity>({
      offset,
      limit,
      orderBy,
      orderDirection,
      period,
      repository: this.getRepository(),
    });
  }
}

export default new StatsRawMempoolService();
