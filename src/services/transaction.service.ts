import { getRepository, ILike, Repository } from 'typeorm';

import { TransactionEntity } from '../entity/transaction.entity';
import { getStartPoint, TPeriod } from '../utils/period';
import blockService from './block.service';

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
    const lastHeight = await blockService.getLastSavedBlock();
    const { block, ...rest } = await this.getRepository()
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
    const confirmations =
      block && block.height ? lastHeight - Number(block.height) : 1;
    return { ...rest, block: { ...block, confirmations } };
  }

  async findAll(
    limit: number,
    offset: number,
    orderBy: keyof TransactionEntity,
    orderDirection: 'DESC' | 'ASC',
    period?: TPeriod,
  ) {
    const from = period ? getStartPoint(period) : 0;
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
      .addSelect('trx.timestamp', 'timestamp')
      .where('trx.timestamp BETWEEN :from AND :to', {
        from: from / 1000,
        to: new Date().getTime() / 1000,
      })
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
  // { time: string; size: number; }[]
  async getTransactionPerSecond(period: TPeriod): Promise<any> {
    let whereSqlText = ' ';
    let duration = 0;
    if (period !== 'all') {
      if (period === '30d') {
        duration = 30 * 24;
      } else if (period === '60d') {
        duration = 60 * 24;
      } else if (period === '180d') {
        duration = 180 * 24;
      } else if (period === '1y') {
        duration = 360 * 24;
      }
      const time_stamp = Date.now() - duration * 60 * 60 * 1000;
      whereSqlText = `timestamp > ${time_stamp / 1000} `;
    }
    const data = await this.getRepository()
      .createQueryBuilder('trx')
      .select([])
      // .limit(5)
      .addSelect(
        "strftime('%m/%d/%Y', datetime(timestamp, 'unixepoch'))",
        'time',
      )
      .addSelect('COUNT(id)', 'size')
      .where(whereSqlText)
      .groupBy("strftime('%Y-%m-%d', datetime(timestamp, 'unixepoch'))")
      .getRawMany();
    return data;
  }
}

export default new TransactionService();
