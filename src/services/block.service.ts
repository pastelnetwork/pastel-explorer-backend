import {
  Between,
  FindManyOptions,
  getRepository,
  ILike,
  Like,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { BlockEntity } from '../entity/block.entity';
import { getSqlTextByPeriodGranularity } from '../utils/helpers';
import { getStartPoint, TGranularity, TPeriod } from '../utils/period';

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
    // eslint-disable-next-line @typescript-eslint/member-delimiter-style
  ): Promise<Array<BlockEntity & { blockCountLastDay: number }>> {
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
    const query: FindManyOptions<BlockEntity> = {
      // skip: offset,
      // take: limit,
      order: {
        [orderBy]: orderDirection,
      },
    };
    if (period) {
      const fromTime = getStartPoint(period) / 1000;
      query.where = {
        timestamp: Between(fromTime, new Date().getTime() / 1000),
      };
    }
    if (offset) {
      query.skip = offset;
    }
    if (limit) {
      query.take = limit;
    }
    if (limit) {
      const statsInfo = await this.getRepository().find(query);
      return statsInfo;
    }
    const count = await this.getRepository().count(query);
    const take = 500;
    const skip = Math.round(count / take);
    let data = [];
    // get statistics data limit 500 for chart
    if (count <= take || skip < 2) {
      const statsInfo = await this.getRepository().find(query);
      return statsInfo;
    } else {
      let index = 0;
      for (let i = 0; i <= count; i += skip) {
        const item = await this.getRepository().find({
          take: 1,
          skip: skip * index,
        });
        index += 1;
        if (item && item.length) {
          data = data.concat(item);
        }
      }
      return data;
    }
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
}

export default new BlockService();
