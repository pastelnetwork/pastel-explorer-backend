import dayjs from 'dayjs';
import { Between, DeleteResult, ILike } from 'typeorm';

import { dataSource } from '../datasource';
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
  private async getRepository() {
    const service = await dataSource;
    return service.getRepository(TransactionEntity);
  }

  async getAllByBlockHash(blockHash: string | null) {
    const service = await this.getRepository();
    if (blockHash === null) {
      return service
        .createQueryBuilder()
        .select(
          'id, totalAmount, recipientCount, size, fee, ticketsTotal, tickets, height',
        )
        .where('(blockHash IS NULL OR blockHash = :blockHash)', { blockHash })
        .getRawMany();
    }
    return service.find({
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
        'height',
      ],
    });
  }

  async searchByTransactionHash(searchParam: string) {
    const service = await this.getRepository();
    return service.find({
      where: {
        id: ILike(`%${searchParam}%`),
      },
      select: ['id'],
      take: 10,
    });
  }

  async findOneById(id: string) {
    const service = await this.getRepository();
    const lastHeight = await blockService.getLastSavedBlock();
    const result = await service
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
    if (!result) {
      return null;
    }
    const confirmations =
      result.block && result.block.height
        ? lastHeight - Number(result.block.height)
        : 1;
    return { ...result, block: { ...result.block, confirmations } };
  }

  async findAll({
    limit,
    offset,
    orderBy,
    orderDirection,
    startDate,
    endDate,
  }: {
    limit: number;
    offset: number;
    orderBy: keyof TransactionEntity;
    orderDirection: 'DESC' | 'ASC';
    startDate: number;
    endDate?: number | null;
  }) {
    const service = await this.getRepository();
    let timeSqlWhere = 'trx.timestamp > 0';
    if (startDate) {
      timeSqlWhere = `trx.timestamp BETWEEN ${
        dayjs(startDate).hour(0).minute(0).millisecond(0).valueOf() / 1000
      } AND ${
        dayjs(startDate).hour(23).minute(59).millisecond(59).valueOf() / 1000
      }`;
      if (endDate) {
        timeSqlWhere = `trx.timestamp BETWEEN ${
          new Date(startDate).getTime() / 1000
        } AND ${new Date(endDate).getTime() / 1000}`;
      }
    }

    return service
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
        'trx.fee',
        'trx.isNonStandard',
        'trx.tickets',
        'trx.ticketsTotal',
        'block.height',
      ])
      .where(timeSqlWhere)
      .leftJoin('trx.block', 'block')
      .getMany();
  }

  async countFindAll(startDate: number, endDate?: number | null) {
    const service = await this.getRepository();
    let timeSqlWhere = 'timestamp > 0';
    if (startDate) {
      timeSqlWhere = `timestamp BETWEEN ${
        dayjs(startDate).hour(0).minute(0).millisecond(0).valueOf() / 1000
      } AND ${
        dayjs(startDate).hour(23).minute(59).millisecond(59).valueOf() / 1000
      }`;
      if (endDate) {
        timeSqlWhere = `timestamp BETWEEN ${
          new Date(startDate).getTime() / 1000
        } AND ${new Date(endDate).getTime() / 1000}`;
      }
    }
    const result = await service
      .createQueryBuilder()
      .select('COUNT(1) as total')
      .where(timeSqlWhere)
      .getRawOne();
    return result.total;
  }

  async getTotalSupply(): Promise<number> {
    const service = await this.getRepository();
    const totalSupply = await service
      .createQueryBuilder('trx')
      .select('SUM(trx.totalAmount)', 'sum')
      .where("trx.coinbase = '1'")
      .getRawOne();
    return totalSupply.sum;
  }

  async findFromTimestamp(
    period: TPeriod,
    // eslint-disable-next-line @typescript-eslint/member-delimiter-style
  ): Promise<Array<TransactionEntity>> {
    const service = await this.getRepository();
    const from = getStartPoint(period) / 1000;
    return await service
      .createQueryBuilder('trx')
      .orderBy('trx.timestamp', 'DESC')
      .select('trx.timestamp * 1000', 'timestamp')
      .addSelect('trx.totalAmount', 'totalAmount')
      .where('trx.timestamp > :from', {
        from: from.toString(),
      })
      .orderBy('timestamp', 'ASC')
      .getRawMany();
  }

  async getTransactionPerSecond(
    period: TPeriod,
    orderDirection: 'DESC' | 'ASC',
    startTime?: number,
  ): Promise<{ time: string; size: number; }[]> {
    const service = await this.getRepository();
    const { whereSqlText } = getSqlTextByPeriod({
      period,
      isMicroseconds: startTime ? true : false,
      startTime,
      isGroupHour: true,
      isGroupHourMicroseconds: true,
    });
    let data = await service
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
    const service = await this.getRepository();
    const transactionVolumes = await service
      .createQueryBuilder('trx')
      .addSelect('SUM(totalAmount)', 'sum')
      .addSelect('timestamp')
      .where(whereSqlText)
      .groupBy("strftime('%Y-%m-%d %H:%M', datetime(timestamp, 'unixepoch'))")
      .getRawMany();
    return transactionVolumes;
  }

  async getBlocksUnconfirmed() {
    const service = await this.getRepository();
    return service
      .createQueryBuilder('tx')
      .select('SUM(tx.size)', 'size')
      .addSelect('COUNT(tx.id)', 'txsCount')
      .addSelect('SUM(ticketsTotal)', 'ticketsTotal')
      .where('(blockHash IS NULL OR blockHash = :blockHash)', {
        blockHash: null,
      })
      .andWhere('height IS NOT NULL')
      .orderBy('timestamp', 'ASC')
      .groupBy('tx.height')
      .getRawMany();
  }

  async getAllTransactionOfBlocksUnconfirmed(offset: number, limit: number) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder('tx')
      .select(
        'id, recipientCount, totalAmount, tickets, size, fee, height, isNonStandard, timestamp',
      )
      .where('(blockHash IS NULL OR blockHash = :blockHash)', {
        blockHash: null,
      })
      .andWhere('height IS NOT NULL')
      .offset(offset)
      .limit(limit)
      .orderBy('timestamp', 'DESC')
      .getRawMany();
  }

  async countTransactionOfBlocksUnconfirmed() {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('1')
      .where('(blockHash IS NULL OR blockHash = :blockHash)', {
        blockHash: null,
      })
      .andWhere('height IS NOT NULL')
      .getCount();
  }

  async getAverageTransactionFee(period: TPeriod) {
    const { whereSqlText, groupBy } = getSqlTextByPeriodGranularity({ period });
    const service = await this.getRepository();
    return service
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
    const { whereSqlText, prevWhereSqlText } = getSqlTextByPeriod({
      period,
      isMicroseconds: startTime ? true : false,
      startTime,
      isTimestamp: true,
      isGroupHour: true,
    });
    const groupBySql = getGroupByForTransaction(groupBy || '');
    const service = await this.getRepository();
    items = await service
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
      const item = await service.find({
        order: { timestamp: 'DESC' },
        take: 1,
      });
      const target = generatePrevTimestamp(item[0].timestamp * 1000, period);
      items = await service
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
        const data = await service
          .createQueryBuilder()
          .select(sql, 'value')
          .where(`timestamp < ${target / 1000}`)
          .getRawOne();
        startValue = data?.value || 0;
      }
    } else {
      if (prevWhereSqlText && isUseStartValue !== 'false') {
        const item = await service
          .createQueryBuilder()
          .select(sql, 'value')
          .where(prevWhereSqlText)
          .getRawOne();
        startValue = item?.value || 0;
      }
    }
    let endValue = 0;
    if (isUseStartValue !== 'false') {
      const item = await service
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
    const service = await this.getRepository();
    return await service
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
    const service = await this.getRepository();
    return await service
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
    const service = await this.getRepository();
    return await service.query(
      `UPDATE \`Transaction\` SET blockHash = NULL, height = NULL WHERE blockHash = '${blockHash}'`,
      [],
    );
  }

  async updateBlockHashNullByTxId(id: string) {
    const service = await this.getRepository();
    return await service.query(
      `UPDATE \`Transaction\` SET blockHash = NULL WHERE id = '${id}'`,
      [],
    );
  }

  async getTransactionByIds(ids: string[]): Promise<TTxIdsProps[]> {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('id')
      .where('id IN (:...ids)', { ids })
      .execute();
  }

  async getTransactionsByTime(
    time: number,
  ): Promise<TTransactionWithoutOutgoingProps[]> {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('id, blockHash, height')
      .where('height IS NOT NULL')
      .andWhere('timestamp >= :time', { time })
      .execute();
  }

  async deleteTransactionByBlockHash(height: string): Promise<DeleteResult> {
    const service = await this.getRepository();
    return await service.delete({ height: Number(height) });
  }

  async getMasternodeCreated(address: string): Promise<number | null> {
    const service = await this.getRepository();
    const item = await service
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
    const service = await this.getRepository();
    const items = await service.find({
      order: { timestamp: 'DESC' },
      take: 1,
    });
    const target = generatePrevTimestamp(items[0].timestamp * 1000, period);
    let groupBy = averageFilterByDailyPeriodQuery;
    if (['24h', '7d', '14d', '30d', '90d'].indexOf(period) !== -1) {
      groupBy = averageFilterByHourlyPeriodQuery;
    }
    return await service
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
    const service = await this.getRepository();
    return await service
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

  async getAllTransactionByBlockHash(blockHash: string | null) {
    const service = await this.getRepository();
    return service.find({
      where: {
        blockHash: blockHash,
      },
      select: [
        'id',
        'totalAmount',
        'recipientCount',
        'tickets',
        'ticketsTotal',
      ],
    });
  }

  async deleteAllTransactionByTxIds(txIds: string[]) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .delete()
      .where('id IN (:...txIds)', { txIds })
      .execute();
  }

  async getAllIdByBlockHeight(blockHeight: number) {
    const service = await this.getRepository();
    return service.find({
      where: {
        height: blockHeight,
      },
      select: ['id', 'timestamp'],
    });
  }

  async countAllTransaction() {
    const service = await this.getRepository();
    return service.createQueryBuilder().select('1').getCount();
  }

  async getTotalSupplyByBlockHeight(blockHeight: number): Promise<number> {
    const service = await this.getRepository();
    const totalSupply = await service
      .createQueryBuilder('trx')
      .select('SUM(trx.totalAmount)', 'sum')
      .where("trx.coinbase = '1'")
      .andWhere('height = :blockHeight', { blockHeight })
      .getRawOne();
    return totalSupply.sum;
  }

  async getUnConfirmTransactionsByBlockHeight(blockHeight: number) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('id, height')
      .where('blockHash IS NULL')
      .andWhere('height < :blockHeight', { blockHeight })
      .getRawMany();
  }
}

export default new TransactionService();
