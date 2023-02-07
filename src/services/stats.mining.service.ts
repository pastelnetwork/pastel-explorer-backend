import { getRepository, Repository } from 'typeorm';

import { MiningInfoEntity } from '../entity/mininginfo.entity';
import { TPeriod } from '../utils/period';
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
      isMicroseconds: true,
      isGroupBy: true,
      select: 'timestamp, networksolps',
    });
  }
}

export default new StatsMiningService();
