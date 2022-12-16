import {
  Between,
  DeleteResult,
  getRepository,
  ILike,
  Repository,
} from 'typeorm';

import { TransactionEntity } from '../entity/transaction.entity';
import {
  averageFilterByDailyPeriodQuery,
  averageFilterByHourlyPeriodQuery,
} from '../utils/constants';
import {
  generatePrevTimestamp,
  getGroupByForTransaction,
  getSqlTextByPeriod,
  getSqlTextByPeriodGranularity,
} from '../utils/helpers';
import { getStartPoint, periodCallbackData, TPeriod } from '../utils/period';
import blockService from './block.service';

type TTxIdsProps = {
  id: string;
};

export type TTransactionWithoutOutgoingProps = {
  id: string;
  blockHash: string;
  height: number;
};

class TransactionService {
  private getRepository(): Repository<TransactionEntity> {
    return getRepository(TransactionEntity);
  }

  async getAllByBlockHash(blockHash: string | null) {
    return this.getRepository().find({
      where: {
        blockHash: blockHash,
      },
      select: [
        'id',
        'totalAmount',
        'recipientCount',
        'size',
        'fee',
        'ticketsTotal',
        'tickets',
      ],
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
        'trx.tickets',
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

  async countFindAll(period?: TPeriod) {
    const from = period ? getStartPoint(period) : 0;
    const result = await this.getRepository()
      .createQueryBuilder()
      .select('COUNT(1) as total')
      .where('timestamp BETWEEN :from AND :to', {
        from: from / 1000,
        to: new Date().getTime() / 1000,
      })
      .getRawOne();
    return result.total;
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
      .where("trx.coinbase = '1'")
      .getRawOne();
    return totalSupply.sum;
  }

  async findFromTimestamp(
    from: number,
    // eslint-disable-next-line @typescript-eslint/member-delimiter-style
  ): Promise<Array<TransactionEntity>> {
    return await this.getRepository()
      .createQueryBuilder('trx')
      .orderBy('trx.timestamp', 'DESC')
      .select('trx.timestamp * 1000', 'timestamp')
      .addSelect('round(trx.totalAmount)', 'totalAmount')
      // .addSelect('round(trx.totalAmount)', 'sum')
      .where('trx.timestamp > :from', {
        from,
      })
      .getRawMany();
  }

  async getTransactionPerSecond(
    period: TPeriod,
    orderDirection: 'DESC' | 'ASC',
    startTime?: number,
  ): Promise<{ time: string; size: number; }[]> {
    const { whereSqlText } = getSqlTextByPeriod(
      period,
      startTime ? true : false,
      startTime,
      false,
      true,
      true,
    );
    let data = await this.getRepository()
      .createQueryBuilder('trx')
      .select([])
      .addSelect('timestamp * 1000', 'time')
      .addSelect('COUNT(id)', 'size')
      .where(whereSqlText)
      .groupBy(averageFilterByHourlyPeriodQuery)
      .orderBy('timestamp', orderDirection)
      .getRawMany();
    if (!data.length && !startTime) {
      data = await this.getLastData(
        'COUNT(id)',
        period,
        'timestamp * 1000',
        'time',
        'size',
      );
    }
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
    orderDirection: 'DESC' | 'ASC',
    startTime?: number,
    groupBy?: string,
    isUseStartValue?: string,
  ) {
    let items: TransactionEntity[] = [];
    let startValue = 0;
    const { whereSqlText, prevWhereSqlText } = getSqlTextByPeriod(
      period,
      startTime ? true : false,
      startTime,
      true,
      true,
    );
    const groupBySql = getGroupByForTransaction(groupBy || '');
    items = await this.getRepository()
      .createQueryBuilder('tx')
      .select(sql, 'value')
      .addSelect('timestamp', 'label')
      .where(whereSqlText)
      .groupBy(groupBySql)
      .orderBy('timestamp', orderDirection)
      .getRawMany();

    if (
      periodCallbackData.indexOf(period) !== -1 &&
      items.length === 0 &&
      !startTime
    ) {
      const item = await this.getRepository().find({
        order: { timestamp: 'DESC' },
        take: 1,
      });
      const target = generatePrevTimestamp(item[0].timestamp * 1000, period);
      items = await this.getRepository()
        .createQueryBuilder()
        .select(sql, 'value')
        .addSelect('timestamp', 'label')
        .where({
          timestamp: Between(target / 1000, item[0].timestamp),
        })
        .groupBy(groupBySql)
        .orderBy('timestamp', 'ASC')
        .getRawMany();

      if (isUseStartValue !== 'false') {
        const data = await this.getRepository()
          .createQueryBuilder()
          .select(sql, 'value')
          .where(`timestamp < ${target / 1000}`)
          .getRawOne();
        startValue = data?.value || 0;
      }
    } else {
      if (prevWhereSqlText && isUseStartValue !== 'false') {
        const item = await this.getRepository()
          .createQueryBuilder()
          .select(sql, 'value')
          .where(prevWhereSqlText)
          .getRawOne();
        startValue = item?.value || 0;
      }
    }
    let endValue = 0;
    if (isUseStartValue !== 'false') {
      const item = await this.getRepository()
        .createQueryBuilder()
        .select(sql, 'value')
        .getRawOne();
      endValue = item.value;
    }

    return {
      items,
      startValue,
      endValue,
    };
  }

  async getIdByHash(blockHash: string): Promise<TransactionEntity[]> {
    return await this.getRepository()
      .createQueryBuilder()
      .select('id')
      .where('blockHash = :blockHash', { blockHash })
      .execute();
  }

  async updateBlockHashById(
    blockHash: string,
    id: string,
    coinbase: number,
    totalAmount: number,
    recipientCount: number,
    rawData: string,
    isNonStandard: number,
    unconfirmedTransactionDetails: string,
  ) {
    return await this.getRepository()
      .createQueryBuilder()
      .update({
        blockHash,
        coinbase,
        totalAmount,
        recipientCount,
        rawData,
        isNonStandard,
        unconfirmedTransactionDetails,
      })
      .where({
        id,
      })
      .execute();
  }

  async updateBlockHashIsNullByHash(blockHash: string) {
    return await this.getRepository().query(
      `UPDATE \`Transaction\` SET blockHash = NULL WHERE blockHash = '${blockHash}'`,
      [],
    );
  }

  async updateBlockHashNullByTxId(id: string) {
    return await this.getRepository().query(
      `UPDATE \`Transaction\` SET blockHash = NULL WHERE id = '${id}'`,
      [],
    );
  }

  async getTransactionByIds(ids: string[]): Promise<TTxIdsProps[]> {
    return this.getRepository()
      .createQueryBuilder()
      .select('id')
      .where('id IN (:...ids)', { ids })
      .execute();
  }

  async getAllTransactions(): Promise<TTransactionWithoutOutgoingProps[]> {
    return this.getRepository()
      .createQueryBuilder()
      .select('id, blockHash, height')
      .where('height IS NOT NULL')
      .execute();
  }

  async getTransactionsByTime(
    time: number,
  ): Promise<TTransactionWithoutOutgoingProps[]> {
    return this.getRepository()
      .createQueryBuilder()
      .select('id, blockHash, height')
      .where('height IS NOT NULL')
      .andWhere('timestamp >= :time', { time })
      .execute();
  }

  async deleteTransactionByBlockHash(hash: string): Promise<DeleteResult> {
    return await this.getRepository()
      .createQueryBuilder()
      .delete()
      .from(TransactionEntity)
      .where('blockHash = :hash', { hash })
      .execute();
  }

  async getMasternodeCreated(address: string): Promise<number | null> {
    const item = await this.getRepository()
      .createQueryBuilder()
      .select('timestamp')
      .where(
        'id IN (SELECT transactionHash FROM AddressEvent WHERE address = :address)',
        { address },
      )
      .andWhere('coinbase = 1')
      .orderBy('timestamp', 'ASC')
      .getRawOne();

    return item ? item.timestamp : null;
  }

  async getLastData(
    sql: string,
    period: TPeriod,
    timestampField = 'timestamp',
    timestampAlias = 'label',
    sizeField = 'value',
  ) {
    const items = await this.getRepository().find({
      order: { timestamp: 'DESC' },
      take: 1,
    });
    const target = generatePrevTimestamp(items[0].timestamp * 1000, period);
    let groupBy = averageFilterByDailyPeriodQuery;
    if (['24h', '7d', '14d', '30d', '90d'].indexOf(period) !== -1) {
      groupBy = averageFilterByHourlyPeriodQuery;
    }
    return await this.getRepository()
      .createQueryBuilder()
      .select(sql, sizeField)
      .addSelect(timestampField, timestampAlias)
      .where({
        timestamp: Between(target / 1000, items[0].timestamp),
      })
      .groupBy(groupBy)
      .orderBy('timestamp', 'ASC')
      .getRawMany();
  }

  async updateTicketForTransaction(
    ticketData: ITransactionTicketData[],
    id: string,
  ) {
    return await this.getRepository()
      .createQueryBuilder()
      .update({
        tickets: JSON.stringify(ticketData),
        ticketsTotal: ticketData.length,
      })
      .where({
        id,
      })
      .execute();
  }
}

export default new TransactionService();
