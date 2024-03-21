import { dataSource } from '../datasource';
import { MiningInfoEntity } from '../entity/mininginfo.entity';
import { TPeriod } from '../utils/period';
import { getChartData } from './chartData.service';

class StatsMiningService {
  private async getRepository() {
    const service = await dataSource;
    return service.getRepository(MiningInfoEntity);
  }

  async getLatest(): Promise<MiningInfoEntity | null> {
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
    orderBy: keyof MiningInfoEntity,
    orderDirection: 'DESC' | 'ASC',
    period: TPeriod,
  ) {
    const service = await this.getRepository();
    return getChartData<MiningInfoEntity>({
      offset,
      limit,
      orderBy,
      orderDirection,
      period,
      repository: service,
      isMicroseconds: true,
      isGroupBy: true,
      select: 'timestamp, networksolps',
    });
  }
}

export default new StatsMiningService();
