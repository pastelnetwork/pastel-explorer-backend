import { getRepository, Repository } from 'typeorm';

import { MempoolInfoEntity } from '../entity/mempoolinfo.entity';
import { getLimitQuery } from '../services/common';
import { TPeriod } from '../utils/period';

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
  ) {
    return getLimitQuery<MempoolInfoEntity>({
      offset,
      limit,
      orderBy,
      orderDirection,
      period,
      repository: this.getRepository(),
    });
  }
}

export default new StatsMempoolInfoService();
