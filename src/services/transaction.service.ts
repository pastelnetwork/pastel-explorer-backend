import { getRepository, ILike, Repository } from 'typeorm';

import { TransactionEntity } from '../entity/transaction.entity';

class TransactionService {
  private getRepository(): Repository<TransactionEntity> {
    return getRepository(TransactionEntity);
  }

  async getAllByBlockHash(blockHash: string | null) {
    return this.getRepository().find({
      where: {
        blockHash: blockHash,
      },
      select: ['id', 'totalAmount', 'recipientCount'],
    });
  }

  async searchByTransactionHash(searchParam: string) {
    return this.getRepository().find({
      where: {
        id: ILike(`${searchParam}%`),
      },
      select: ['id'],
      take: 10,
    });
  }

  async findOneById(id: string) {
    return this.getRepository()
      .createQueryBuilder('trx')
      .select([
        'trx.id',
        'trx.timestamp',
        'trx.blockHash',
        'trx.totalAmount',
        'trx.recipientCount',
        'trx.coinbase',
        'trx.isNonStandard',
        'trx.rawData',
        'trx.unconfirmedTransactionDetails',
        'block.height',
        'block.confirmations',
      ])
      .where('trx.id = :id', { id })
      .leftJoin('trx.block', 'block')
      .getOne();
  }

  async findAll(
    limit: number,
    offset: number,
    orderBy: keyof TransactionEntity,
    orderDirection: 'DESC' | 'ASC',
  ) {
    return this.getRepository()
      .createQueryBuilder('trx')
      .limit(limit)
      .offset(offset)
      .orderBy(`trx.${orderBy}`, orderDirection)
      .select([
        'trx.id',
        'trx.timestamp',
        'trx.blockHash',
        'trx.totalAmount',
        'trx.recipientCount',
        'trx.coinbase',
        'trx.isNonStandard',
        'block.height',
        'block.confirmations',
      ])
      .leftJoin('trx.block', 'block')
      .getMany();
  }
  async findAllBetweenTimestamps(
    from: number,
    to: number,
    // eslint-disable-next-line @typescript-eslint/member-delimiter-style
  ): Promise<Array<TransactionEntity & { sum: number }>> {
    const transactionVolumes = await this.getRepository()
      .createQueryBuilder('trx')
      .select('trx.totalAmount', 'totalAmount')
      .addSelect('SUM(round(totalAmount))', 'sum')
      .addSelect('trx.timestamp', 'timestamp')
      .where('trx.timestamp BETWEEN :from AND :to', {
        from: from,
        to: to,
      })
      .groupBy('blockHash')
      .getRawMany();
    return transactionVolumes;
  }
  async getTotalSupply(): Promise<number> {
    const totalSupply = await this.getRepository()
      .createQueryBuilder('trx')
      .select('trx.totalAmount', 'totalAmount')
      .addSelect('SUM(totalAmount)', 'sum')
      .addSelect('trx.coinbase', 'coinbase')
      .where('trx.coinbase = "1"')
      .getRawOne();
    return totalSupply.sum;
  }

  async findFromTimestamp(
    from: number,
    // eslint-disable-next-line @typescript-eslint/member-delimiter-style
  ): Promise<Array<TransactionEntity>> {
    return (
      this.getRepository()
        .createQueryBuilder('trx')
        .orderBy('trx.timestamp', 'DESC')
        .select('trx.timestamp * 1000', 'timestamp')
        .addSelect('round(trx.totalAmount)', 'totalAmount')
        // .addSelect('round(trx.totalAmount)', 'sum')
        .where('trx.timestamp > :from', {
          from,
        })
        .getRawMany()
    );
  }
}

export default new TransactionService();
