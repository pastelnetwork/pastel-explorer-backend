import { getRepository, Repository } from 'typeorm';

import { StatsEntity } from '../entity/stats.entity';

class StatsService {
  private getRepository(): Repository<StatsEntity> {
    return getRepository(StatsEntity);
  }
  async getLatest(): Promise<StatsEntity | null> {
    const items = await this.getRepository().find({
      order: { timestamp: 'DESC' },
      take: 1,
    });
    return items.length === 1 ? items[0] : null;
  }
}

export default new StatsService();
