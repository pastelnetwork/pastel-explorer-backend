import { getRepository, ILike, Like, Repository } from 'typeorm';

import { BlockEntity } from '../entity/block.entity';
import { TransactionEntity } from '../entity/transaction.entity';

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
  async getAll(
    offset: number,
    limit: number,
    orderBy: keyof TransactionEntity,
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
