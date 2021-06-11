import { getRepository, Repository } from 'typeorm';

import { StatsDifficultyEntity } from '../entity/statsdifficulty.entity';

class StatsService {
  private getRepository(): Repository<StatsDifficultyEntity> {
    return getRepository(StatsDifficultyEntity);
  }
  async getAll(
    offset: number,
    limit: number,
    orderBy: keyof StatsDifficultyEntity,
    orderDirection: 'DESC' | 'ASC',
  ) {
    const statsInfo = await this.getRepository().find({
      skip: offset,
      take: limit,
      order: {
        [orderBy]: orderDirection,
      },
    });
    return statsInfo;
  }
}

export default new StatsService();
