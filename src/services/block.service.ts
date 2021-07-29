import {
  Between,
  getRepository,
  ILike,
  Like,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { BlockEntity } from '../entity/block.entity';
import { getSqlTextByPeriodGranularity } from '../utils/helpers';
import { getStartPoint, TGranularity, TPeriod } from '../utils/period';
import { getChartData } from './chartData.service';

class BlockService {
  private getRepository(): Repository<BlockEntity> {
    return getRepository(BlockEntity);
  }
  async getOneByIdOrHeight(query: string) {
    const highest = await this.getLastSavedBlock();
    const block = await this.getRepository().findOne({
      where: [
        {
          id: query,
        },
        {
          height: query,
        },
      ],
    });
    return { ...block, confirmations: highest - Number(block.height) };
  }
  async getLastDayBlocks() {
    const lastDayTimestamp = (Date.now() - 1000 * 60 * 60 * 24) / 1000;
    return this.getRepository().find({
      order: { timestamp: 'DESC' },
      where: {
        timestamp: MoreThanOrEqual(lastDayTimestamp),
      },
    });
  }

  async getAll(
    offset: number,
    limit: number,
    orderBy: keyof BlockEntity,
    orderDirection: 'DESC' | 'ASC',
    period?: TPeriod,
  ) {
    const highest = await this.getLastSavedBlock();
    const from = period ? getStartPoint(period) : 0;
    const blocks = await this.getRepository().find({
      skip: offset,
      take: limit,
      where: {
        timestamp: Between(from / 1000, new Date().getTime() / 1000),
      },
      order: {
        [orderBy]: orderDirection,
      },
    });
    return blocks.map(b => ({
      ...b,
      confirmations: highest - Number(b.height),
    }));
  }

  async findAllBetweenTimestamps(
    from: number,
    to: number,
  ): Promise<Array<BlockEntity & { blockCountLastDay: number; }>> {
    const blockDifficulties = this.getRepository()
      .createQueryBuilder('block')
      .select('block.difficulty', 'difficulty')
      .addSelect('block.timestamp', 'timestamp')
      .addSelect(
        '(select count(*) from Block d where d.timestamp BETWEEN (block.timestamp - 86400) AND (block.timestamp))',
        'blockCountLastDay',
      )
      .where('block.timestamp BETWEEN :from AND :to', {
        from: from,
        to: to,
      })
      .getRawMany();
    return blockDifficulties;
  }

  async searchByBlockHash(searchParam: string) {
    return this.getRepository().find({
      where: {
        id: ILike(`${searchParam}%`),
      },

      select: ['id'],
      take: 10,
    });
  }

  async searchByBlockHeight(searchParam: string) {
    return this.getRepository().find({
      where: {
        height: Like(`${searchParam}%`),
      },
      select: ['height'],
      take: 10,
    });
  }
  async updateConfirmations(latestBlockHeight: number) {
    return this.getRepository().query(
      'update block set confirmations = (? - height)',
      [latestBlockHeight],
    );
  }
  async updateNextBlockHashes() {
    return this.getRepository().query(
      'update block as b set "nextBlockHash" = (select id from block where height = CAST(b.height AS INT) + 1) where "nextBlockHash" is NULL',
      [],
    );
  }
  async getLastSavedBlock(): Promise<number> {
    const { height } = await this.getRepository()
      .createQueryBuilder('block')
      .select('MAX(block.timestamp), height')
      .getRawOne();
    return Number(height);
  }

  async getStatisticsBlocks(
    offset: number,
    limit: number,
    orderBy: keyof BlockEntity,
    orderDirection: 'DESC' | 'ASC',
    period: TPeriod,
  ): Promise<BlockEntity[]> {
    return getChartData<BlockEntity>({
      offset,
      limit,
      orderBy,
      orderDirection,
      period,
      repository: this.getRepository(),
      isMicroseconds: false,
    });
  }
  async getAverageBlockSizeStatistics(
    period: TPeriod,
    granularity: TGranularity,
  ) {
    const { groupBy, whereSqlText } = getSqlTextByPeriodGranularity(
      period,
      granularity,
    );
    const data = await this.getRepository()
      .createQueryBuilder('block')
      .select([])
      .addSelect(groupBy, 'time')
      .addSelect('AVG(size)', 'size')
      .where(whereSqlText)
      .groupBy(groupBy)
      .getRawMany();
    return data;
  }

  async getBlocksInfo(
    sqlQuery: string,
    period: TPeriod,
    granularity: TGranularity,
  ) {
    const { groupBy, whereSqlText } = getSqlTextByPeriodGranularity(
      period,
      granularity,
    );
    return await this.getRepository()
      .createQueryBuilder()
      .select(groupBy, 'label')
      .addSelect(`round(${sqlQuery}, 2)`, 'value')
      .where(whereSqlText)
      .groupBy(groupBy)
      .getRawMany();
  }
}

export default new BlockService();
