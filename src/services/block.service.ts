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
}

export default new BlockService();
