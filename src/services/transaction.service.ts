import { getRepository, ILike, Repository } from 'typeorm';

import { TransactionEntity } from '../entity/transaction.entity';
import { getSqlTextByPeriodGranularity } from '../utils/helpers';
import { getStartPoint, TGranularity, TPeriod } from '../utils/period';
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
      select: ['id', 'totalAmount', 'recipientCount', 'size', 'fee'],
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
        'trx.fee',
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

  async getTransactionPerSecond(
    period: TPeriod,
  ): Promise<{ time: string; size: number; }[]> {
    let whereSqlText = ' ';
    if (period !== 'all') {
      const time_stamp = getStartPoint(period);
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

  async getVolumeOfTransactions(period: TPeriod) {
    let whereSqlText = ' ';
    if (period !== 'all') {
      const time_stamp = getStartPoint(period);
      whereSqlText = `timestamp > ${time_stamp / 1000} `;
    }
    const transactionVolumes = await this.getRepository()
      .createQueryBuilder('trx')
      // .select('trx.totalAmount', 'totalAmount')
      .addSelect('SUM(round(totalAmount))', 'sum')
      .addSelect(
        "strftime('%m/%d/%Y', datetime(timestamp, 'unixepoch'))",
        'timestamp',
      )
      .where(whereSqlText)
      .groupBy("strftime('%Y-%m-%d', datetime(timestamp, 'unixepoch'))")
      .getRawMany();
    return transactionVolumes;
  }

  async getBlocksUnconfirmed() {
    return this.getRepository()
      .createQueryBuilder('tx')
      .select(['height', 'blockhash', 'timestamp'])
      .addSelect('SUM(tx.size)', 'size')
      .addSelect('SUM(tx.fee)', 'fee')
      .addSelect('COUNT(tx.id)', 'txsCount')
      .where({
        blockHash: null,
      })
      .orderBy('timestamp', 'ASC')
      .groupBy('tx.height')
      .getRawMany();
  }

  async getAverageTransactionFee(period: TPeriod) {
    const { whereSqlText, groupBy } = getSqlTextByPeriodGranularity(period);
    return this.getRepository()
      .createQueryBuilder('tx')
      .select('AVG(tx.fee)', 'fee')
      .addSelect(groupBy, 'time')
      .where(whereSqlText)
      .groupBy(groupBy)
      .getRawMany();
  }

  async getTransactionsInfo(
    sql: string,
    period: TPeriod,
    granularity?: TGranularity,
  ) {
    const { whereSqlText, groupBy } = getSqlTextByPeriodGranularity(
      period,
      granularity,
    );
    return this.getRepository()
      .createQueryBuilder('tx')
      .select(sql, 'value')
      .addSelect(groupBy, 'label')
      .where(whereSqlText)
      .groupBy(groupBy)
      .getRawMany();
  }
}

export default new TransactionService();
