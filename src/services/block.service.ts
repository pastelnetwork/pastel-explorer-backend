import dayjs from 'dayjs';
import { Between, DeleteResult, ILike, Like, MoreThanOrEqual } from 'typeorm';

import { dataSource } from '../datasource';
import { BlockEntity } from '../entity/block.entity';
import { BatchAddressEvents } from '../scripts/seed-blockchain-data/update-database';
import {
  averageFilterByDailyPeriodQuery,
  averageFilterByHourlyPeriodQuery,
  periodGroupByHourly,
} from '../utils/constants';
import {
  generatePrevTimestamp,
  getSqlTextByPeriod,
  getSqlTextByPeriodGranularity,
} from '../utils/helpers';
import {
  getStartPoint,
  periodCallbackData,
  TGranularity,
  TPeriod,
} from '../utils/period';
import { getChartData } from './chartData.service';
import transactionService from './transaction.service';

class BlockService {
  private async getRepository() {
    const service = await dataSource;
    return service.getRepository(BlockEntity);
  }
  async getOneByIdOrHeight(query: string) {
    const service = await this.getRepository();
    const highest = await this.getLastSavedBlock();
    const block = await service.findOne({
      where: [
        {
          id: query,
        },
        {
          height: query,
        },
      ],
    });
    return { ...block, confirmations: highest - Number(block?.height) };
  }
  async getLastDayBlocks() {
    const service = await this.getRepository();
    const lastDayTimestamp = (Date.now() - 1000 * 60 * 60 * 24) / 1000;
    return service.find({
      order: { timestamp: 'DESC' },
      where: {
        timestamp: MoreThanOrEqual(lastDayTimestamp),
      },
    });
  }

  async getAll({
    offset,
    limit,
    orderBy,
    orderDirection,
    startDate,
    types,
    endDate,
  }: {
    offset: number;
    limit: number;
    orderBy: keyof BlockEntity;
    orderDirection: 'DESC' | 'ASC';
    types?: string;
    startDate: number;
    endDate?: number | null;
  }) {
    const service = await this.getRepository();
    const buildSql = service
      .createQueryBuilder()
      .select(
        'id, timestamp, height, size, transactionCount, ticketsList, totalTickets, type',
      );
    let hasWhere = false;
    if (startDate) {
      buildSql.where('timestamp >= :startDate', {
        startDate: dayjs(startDate).valueOf() / 1000,
      });
      if (endDate) {
        buildSql.where('timestamp <= :endDate', {
          endDate: dayjs(endDate).valueOf() / 1000,
        });
      }
      hasWhere = true;
    }

    if (types) {
      const newTypes = types.split(',');
      const where = [];
      for (let i = 0; i < newTypes.length; i += 1) {
        if (newTypes[i]) {
          if (['cascade', 'sense'].includes(newTypes[i])) {
            where.push(`ticketsList LIKE '%"actionType":"${newTypes[i]}"%'`);
          } else {
            where.push(`ticketsList LIKE '%"type":"${newTypes[i]}"%'`);
          }
        }
      }
      if (hasWhere) {
        buildSql.andWhere(where.join(' OR '));
      } else {
        buildSql.where(where.join(' OR '));
      }
    }
    let orderSql = orderBy as string;
    if (orderBy === 'height' || orderBy === 'id') {
      orderSql = 'CAST(height AS INT)';
    }
    buildSql.orderBy(orderSql, orderDirection);
    buildSql.offset(offset);
    buildSql.limit(limit);
    return buildSql.getRawMany();
  }

  async countGetAll({
    types,
    startDate,
    endDate,
  }: {
    types?: string;
    startDate: number;
    endDate?: number | null;
  }) {
    const service = await this.getRepository();
    const buildSql = service.createQueryBuilder().select('1');
    let hasWhere = false;
    if (startDate) {
      buildSql.where('timestamp >= :startDate', {
        startDate: dayjs(startDate).valueOf() / 1000,
      });
      if (endDate) {
        buildSql.where('timestamp <= :endDate', {
          endDate: dayjs(endDate).valueOf() / 1000,
        });
      }
      hasWhere = true;
    }

    if (types) {
      const newTypes = types.split(',');
      const where = [];
      for (let i = 0; i < newTypes.length; i += 1) {
        if (newTypes[i]) {
          if (['cascade', 'sense'].includes(newTypes[i])) {
            where.push(`ticketsList LIKE '%"actionType":"${newTypes[i]}"%'`);
          } else {
            where.push(`ticketsList LIKE '%"type":"${newTypes[i]}"%'`);
          }
        }
      }
      if (hasWhere) {
        buildSql.andWhere(where.join(' OR '));
      } else {
        buildSql.where(where.join(' OR '));
      }
    }
    return buildSql.getCount();
  }

  async findAllBetweenTimestamps(
    from: number,
    to: number,
  ): Promise<Array<BlockEntity & { blockCountLastDay: number; }>> {
    const service = await this.getRepository();
    const blockDifficulties = service
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
    const service = await this.getRepository();
    return service.find({
      where: {
        id: ILike(`%${searchParam}%`),
      },

      select: ['id'],
      take: 10,
    });
  }

  async searchByBlockHeight(searchParam: string) {
    const service = await this.getRepository();
    return service.find({
      where: {
        height: Like(`%${searchParam}%`),
      },
      select: ['height'],
      take: 10,
    });
  }

  async updateNextBlockHashes() {
    const service = await this.getRepository();
    return service.query(
      'update block as b set "nextBlockHash" = (select id from block where height = CAST(b.height AS INT) + 1) where "nextBlockHash" is NULL',
      [],
    );
  }
  async getLastSavedBlock(): Promise<number> {
    const service = await this.getRepository();
    const result = await service
      .createQueryBuilder()
      .select('height')
      .orderBy('CAST(height AS Number)', 'DESC')
      .getRawOne();
    return result?.height ? Number(result?.height) : 0;
  }

  async getStatisticsBlocks(
    offset: number,
    limit: number,
    orderBy: keyof BlockEntity,
    orderDirection: 'DESC' | 'ASC',
    period: TPeriod,
    startTime?: number,
  ): Promise<BlockEntity[]> {
    const service = await this.getRepository();
    return getChartData<BlockEntity>({
      offset,
      limit,
      orderBy,
      orderDirection,
      period,
      repository: service,
      isMicroseconds: false,
      isGroupBy: periodGroupByHourly.includes(period) ? true : false,
      select: 'timestamp, height, transactionCount',
      startTime,
    });
  }
  async getAverageBlockSizeStatistics(
    period: TPeriod,
    granularity: TGranularity,
    orderDirection: 'DESC' | 'ASC',
    format: string,
    startTime?: number,
  ) {
    const { groupBy, whereSqlText, groupBySelect } =
      getSqlTextByPeriodGranularity({
        period,
        granularity,
        startTime: startTime ? startTime * 1000 : 0,
      });

    let queryMinTime = `${groupBySelect} AS minTime`;
    let queryMaxTime = `${groupBySelect} AS maxTime`;
    if (period !== '24h') {
      queryMinTime =
        "strftime('%m/%d/%Y', datetime(MIN(timestamp), 'unixepoch')) AS minTime";
      queryMaxTime =
        "strftime('%m/%d/%Y', datetime(MAX(timestamp), 'unixepoch')) AS maxTime";
    }

    if (format) {
      queryMinTime = 'MIN(timestamp) AS minTime';
      queryMaxTime = 'MAX(timestamp) AS maxTime';
    }

    const service = await this.getRepository();
    let data = await service
      .createQueryBuilder('block')
      .select(format ? 'timestamp' : groupBySelect, 'time')
      .addSelect(queryMinTime)
      .addSelect(queryMaxTime)
      .addSelect('AVG(size)', 'size')
      .where(whereSqlText)
      .groupBy(groupBy)
      .orderBy('timestamp', orderDirection)
      .getRawMany();
    if (
      periodCallbackData.indexOf(period) !== -1 &&
      data.length === 0 &&
      !startTime
    ) {
      const item = await service.find({
        order: { timestamp: 'DESC' },
        take: 1,
      });
      const target = generatePrevTimestamp(item[0].timestamp * 1000, period);
      data = await service
        .createQueryBuilder()
        .select([])
        .addSelect(format ? 'timestamp' : groupBySelect, 'time')
        .addSelect('AVG(size)', 'size')
        .addSelect(queryMinTime)
        .addSelect(queryMaxTime)
        .where({
          timestamp: Between(target / 1000, item[0].timestamp),
        })
        .groupBy("strftime('%H %m/%d/%Y', datetime(timestamp, 'unixepoch'))")
        .orderBy('timestamp', 'ASC')
        .getRawMany();
    }
    return data;
  }

  async getBlocksInfo(
    sqlQuery: string,
    period: TPeriod,
    granularity: TGranularity,
    orderDirection: 'DESC' | 'ASC',
    startTime?: number,
  ) {
    const service = await this.getRepository();
    const { groupBy, whereSqlText } = getSqlTextByPeriodGranularity({
      period,
      granularity,
      startTime,
    });

    let blocks = await service
      .createQueryBuilder()
      .select('timestamp * 1000', 'label')
      .addSelect(`round(${sqlQuery}, 2)`, 'value')
      .where(whereSqlText)
      .groupBy(groupBy)
      .orderBy('timestamp', orderDirection)
      .getRawMany();

    if (!blocks.length && !startTime) {
      blocks = await this.getLastData(
        `round(${sqlQuery}, 2)`,
        period,
        'timestamp * 1000',
      );
    }

    return blocks;
  }

  async getBlockchainSizeInfo(
    sqlQuery: string,
    period: TPeriod,
    orderDirection: 'DESC' | 'ASC',
    startTime?: number,
  ) {
    const service = await this.getRepository();
    const { groupBy, whereSqlText, prevWhereSqlText } = getSqlTextByPeriod({
      period,
      startTime,
    });
    const select = `round(${sqlQuery}, 2)`;
    let items: BlockEntity[] = await service
      .createQueryBuilder()
      .select('timestamp * 1000', 'label')
      .addSelect(select, 'value')
      .where(whereSqlText)
      .groupBy(groupBy)
      .orderBy('timestamp', orderDirection)
      .getRawMany();

    let startValue = 0;
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
        .select('timestamp * 1000', 'label')
        .addSelect(select, 'value')
        .where({
          timestamp: Between(target / 1000, item[0].timestamp),
        })
        .groupBy(groupBy)
        .orderBy('timestamp', 'ASC')
        .getRawMany();

      const data = await service
        .createQueryBuilder()
        .select('SUM(size)', 'value')
        .where(`timestamp < ${target / 1000}`)
        .getRawOne();
      startValue = data?.value || 0;
    } else {
      if (prevWhereSqlText) {
        const item = await service
          .createQueryBuilder()
          .select('SUM(size)', 'value')
          .where(prevWhereSqlText)
          .getRawOne();
        startValue = item?.value || 0;
      }
    }
    const item = await service
      .createQueryBuilder()
      .select('SUM(size)', 'value')
      .getRawOne();
    return { items, startValue, endValue: item.value };
  }

  async updateBlockHash(
    newId: string,
    height: number,
    currentHash: string,
    blockData: {
      timestamp: number;
      confirmations: number;
      difficulty: string;
      merkleRoot: string;
      nonce: string;
      solution: string;
      size: number;
      transactionCount: number;
    },
    transactionList: TransactionData[],
    addressEvents: BatchAddressEvents,
    txIds: string[],
  ): Promise<void> {
    const service = await this.getRepository();
    await service.query(
      `UPDATE block SET nextBlockHash = '${newId}' WHERE height = '${
        height - 1
      }'`,
      [],
    );
    const transactions = await transactionService.getIdByHash(currentHash);
    await transactionService.updateBlockHashIsNullByHash(currentHash);
    await service.query(
      `UPDATE block SET id = '${newId}', timestamp = '${blockData.timestamp}', confirmations = '${blockData.confirmations}', difficulty = '${blockData.difficulty}', merkleRoot = '${blockData.merkleRoot}', nonce = '${blockData.nonce}', solution = '${blockData.solution}', size = '${blockData.size}', transactionCount = '${blockData.transactionCount}' WHERE height = '${height}'`,
      [],
    );

    const updateTransactionInfo = async (item, txid) => {
      const totalAmount = addressEvents
        .filter(v => v.transactionHash === item.txid && v.amount > 0)
        .reduce((acc, curr) => acc + Number(curr.amount), 0);
      const recipientCount = item.vout.filter(
        v => v?.scriptPubKey?.addresses,
      ).length;
      const coinbase =
        (item.vin.length === 1 && Boolean(item.vin[0].coinbase) ? 1 : 0) ||
        null;
      const rawData = JSON.stringify(item);
      const isNonStandard = item.vout.length === 0 ? 1 : null;
      const unconfirmedTransactionDetails = item.blockhash
        ? null
        : JSON.stringify({
            addressEvents: addressEvents.filter(
              v => v.transactionHash === item.txid,
            ),
          });
      await transactionService.updateBlockHashById(
        newId,
        txid,
        coinbase,
        totalAmount,
        recipientCount,
        rawData,
        isNonStandard,
        unconfirmedTransactionDetails,
      );
    };
    for (const transaction of transactions) {
      const item = transactionList.find(t => t?.txid === transaction.id);
      if (item) {
        await updateTransactionInfo(item, transaction.id);
      }
    }
    for (const txid of txIds) {
      const item = transactionList.find(t => t?.txid === txid);
      if (item) {
        await updateTransactionInfo(item, txid);
      }
    }
  }

  async getHeightIdByPreviousBlockHash(
    hash: string,
  ): Promise<{ height: number; id: string; }> {
    try {
      const service = await this.getRepository();
      const { height, id } = await service
        .createQueryBuilder('block')
        .select('height, id')
        .where('previousBlockHash = :hash', { hash })
        .getRawOne();
      return {
        height: Number(height),
        id,
      };
    } catch {
      return {
        height: 0,
        id: '',
      };
    }
  }

  async getBlockHeightUnCorrect(): Promise<{ height: number; }[]> {
    const service = await this.getRepository();
    return service.query(
      'SELECT height FROM Block b WHERE id NOT IN (SELECT previousBlockHash FROM Block WHERE height = CAST(b.height AS INT) + 1)',
      [],
    );
  }

  async getBlockByHash(hash: string) {
    const service = await this.getRepository();
    const block = await service.findOne({
      where: [
        {
          id: hash,
        },
      ],
    });
    return block;
  }

  async deleteBlockByHash(hash: string): Promise<DeleteResult> {
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .delete()
      .from(BlockEntity)
      .where('id = :hash', { hash })
      .execute();
  }

  async getLastData(
    sql: string,
    period: TPeriod,
    timestampField = 'timestamp',
    timestampAlias = 'label',
    sizeField = 'value',
    isSelectAll = false,
    customSelect = '*',
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
    if (['1h', '3h', '6h', '12h'].indexOf(period) !== -1) {
      groupBy = '';
    }
    if (isSelectAll) {
      return await service
        .createQueryBuilder()
        .select(customSelect)
        .where({
          timestamp: Between(target / 1000, items[0].timestamp),
        })
        .groupBy(groupBy)
        .orderBy('timestamp', 'ASC')
        .getRawMany();
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

  async getLastBlockInfo(): Promise<BlockEntity> {
    const service = await this.getRepository();
    const result = await service
      .createQueryBuilder()
      .select('timestamp, MAX(CAST(height AS Number)) AS height')
      .getRawOne();
    return result;
  }

  async updateTotalTicketsForBlock(
    ticketData: IBlockTicketData[],
    height: number,
  ) {
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .update({
        totalTickets: ticketData.length,
        ticketsList: JSON.stringify(ticketData),
      })
      .where({
        height: `${height}`,
      })
      .execute();
  }

  async getIncorrectBlocksByHashAndHeight(hash: string, height: string) {
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .select('id, height')
      .where('height = :height', { height })
      .andWhere('id != :hash', { hash })
      .getRawOne();
  }

  async getReorgBlock(hash: string, height: string) {
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .select('id, height')
      .where('height != :height', { height })
      .andWhere('id == :hash', { hash })
      .getRawOne();
  }

  async getBlockByIdOrHeight(query: string) {
    const service = await this.getRepository();
    const highest = await this.getLastSavedBlock();
    const block = await service
      .createQueryBuilder()
      .select(
        'id, height, difficulty, merkleRoot, nextBlockHash, nonce, previousBlockHash, timestamp, size, type',
      )
      .where('id = :query', { query })
      .orWhere('height = :query', { query })
      .getRawOne();

    if (!block) {
      return null;
    }

    return { ...block, confirmations: highest - Number(block?.height) };
  }

  async getAllBlockSize(
    offset: number,
    limit: number,
    orderBy: keyof BlockEntity,
    orderDirection: 'DESC' | 'ASC',
    period?: TPeriod,
  ) {
    const from = period ? getStartPoint(period) : 0;
    let orderSql = orderBy as string;
    if (orderBy === 'id') {
      orderSql = 'CAST(height  AS INT)';
    }
    let limitSql = '';
    if (limit) {
      limitSql = `LIMIT ${limit}`;
      if (offset) {
        limitSql = `LIMIT ${offset}, ${limit}`;
      }
    }
    const service = await this.getRepository();
    const blocks =
      await service.query(`SELECT timestamp, size FROM block WHERE timestamp BETWEEN ${
        from / 1000
      } AND ${new Date().getTime() / 1000}
      ORDER BY ${orderSql} ${orderDirection} ${limitSql}`);

    return blocks;
  }

  async getAllBlockForStatistics(
    offset: number,
    limit: number,
    orderBy: keyof BlockEntity,
    orderDirection: 'DESC' | 'ASC',
    period?: TPeriod,
  ) {
    const from = period ? getStartPoint(period) : 0;
    let orderSql = orderBy as string;
    if (orderBy === 'id') {
      orderSql = 'CAST(height  AS INT)';
    }
    let limitSql = '';
    if (limit) {
      limitSql = `LIMIT ${limit}`;
      if (offset) {
        limitSql = `LIMIT ${offset}, ${limit}`;
      }
    }
    const service = await this.getRepository();
    const blocks =
      await service.query(`SELECT id, timestamp, transactionCount, height, size, totalTickets FROM block WHERE timestamp BETWEEN ${
        from / 1000
      } AND ${new Date().getTime() / 1000}
      ORDER BY ${orderSql} ${orderDirection} ${limitSql}`);

    return blocks;
  }

  async getBlockByBlockHeights(height: number[]) {
    const service = await this.getRepository();
    console.log('height', height);
    return service
      .createQueryBuilder()
      .select('height, timestamp, id')
      .where('height IN (:...height)', { height })
      .getRawMany();
  }
}

export default new BlockService();
