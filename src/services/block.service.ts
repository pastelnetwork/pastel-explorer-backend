import {
  getRepository,
  ILike,
  Like,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { BlockEntity } from '../entity/block.entity';

class BlockService {
  private getRepository(): Repository<BlockEntity> {
    return getRepository(BlockEntity);
  }
  async getOneByIdOrHeight(query: string) {
    return this.getRepository().findOne({
      where: [
        {
          id: query,
        },
        {
          height: query,
        },
      ],
    });
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
  ) {
    return this.getRepository().find({
      skip: offset,
      take: limit,
      order: {
        [orderBy]: orderDirection,
      },
    });
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
}

export default new BlockService();
