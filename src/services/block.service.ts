import {
  Between,
  DeleteResult,
  getRepository,
  ILike,
  Like,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

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
    return { ...block, confirmations: highest - Number(block?.height) };
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

  async countGetAll(period?: TPeriod) {
    const from = period ? getStartPoint(period) : 0;
    const results = await this.getRepository()
      .createQueryBuilder()
      .select('COUNT(1) as total')
      .where('timestamp BETWEEN :from AND :to', {
        from: from / 1000,
        to: new Date().getTime() / 1000,
      })
      .getRawOne();
    return results.total;
  }

  async findAllBetweenTimestamps(
    from: number,
    to: number,
  ): Promise<Array<BlockEntity & { blockCountLastDay: number; }>> {
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
    const results = await this.getRepository()
      .createQueryBuilder('block')
      .select('MAX(block.timestamp), height')
      .getRawOne();
    return results?.height ? Number(results?.height) : 0;
  }

  async getStatisticsBlocks(
    offset: number,
    limit: number,
    orderBy: keyof BlockEntity,
    orderDirection: 'DESC' | 'ASC',
    period: TPeriod,
    startTime?: number,
  ): Promise<BlockEntity[]> {
    return getChartData<BlockEntity>({
      offset,
      limit,
      orderBy,
      orderDirection,
      period,
      repository: this.getRepository(),
      isMicroseconds: false,
      isGroupBy: periodGroupByHourly.includes(period) ? true : false,
      select: '*',
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
      getSqlTextByPeriodGranularity(
        period,
        granularity,
        false,
        startTime ? startTime * 1000 : 0,
      );

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

    let data = await this.getRepository()
      .createQueryBuilder('block')
      .select([])
      .addSelect(format ? 'timestamp' : groupBySelect, 'time')
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
      const item = await this.getRepository().find({
        order: { timestamp: 'DESC' },
        take: 1,
      });
      const target = generatePrevTimestamp(item[0].timestamp * 1000, period);
      data = await this.getRepository()
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
    const { groupBy, whereSqlText } = getSqlTextByPeriodGranularity(
      period,
      granularity,
      false,
      startTime,
    );

    let blocks = await this.getRepository()
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
    const { groupBy, whereSqlText, prevWhereSqlText } = getSqlTextByPeriod(
      period,
      false,
      startTime,
    );
    let select = `round(${sqlQuery}, 2)`;
    if (!periodGroupByHourly.includes(period)) {
      select = 'size';
    }

    let items: BlockEntity[] = await this.getRepository()
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
      const item = await this.getRepository().find({
        order: { timestamp: 'DESC' },
        take: 1,
      });
      const target = generatePrevTimestamp(item[0].timestamp * 1000, period);
      items = await this.getRepository()
        .createQueryBuilder()
        .select('timestamp * 1000', 'label')
        .addSelect(select, 'value')
        .where({
          timestamp: Between(target / 1000, item[0].timestamp),
        })
        .groupBy(groupBy)
        .orderBy('timestamp', 'ASC')
        .getRawMany();

      const data = await this.getRepository()
        .createQueryBuilder()
        .select('SUM(size)', 'value')
        .where(`timestamp < ${target / 1000}`)
        .getRawOne();
      startValue = data?.value || 0;
    } else {
      if (prevWhereSqlText) {
        const item = await this.getRepository()
          .createQueryBuilder()
          .select('SUM(size)', 'value')
          .where(prevWhereSqlText)
          .getRawOne();
        startValue = item?.value || 0;
      }
    }
    const item = await this.getRepository()
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
    await this.getRepository().query(
      `UPDATE block SET nextBlockHash = '${newId}' WHERE height = '${
        height - 1
      }'`,
      [],
    );
    const transactions = await transactionService.getIdByHash(currentHash);
    await transactionService.updateBlockHashIsNullByHash(currentHash);
    await this.getRepository().query(
      `UPDATE block SET id = '${newId}', timestamp = '${blockData.timestamp}', confirmations = '${blockData.confirmations}', difficulty = '${blockData.difficulty}', merkleRoot = '${blockData.merkleRoot}', nonce = '${blockData.nonce}', solution = '${blockData.solution}', size = '${blockData.size}', transactionCount = '${blockData.transactionCount}' WHERE height = '${height}'`,
      [],
    );

    const updateTransactionInfo = async (item, txid) => {
      const totalAmount = addressEvents
        .filter(v => v.transactionHash === item.txid && v.amount > 0)
        .reduce((acc, curr) => acc + Number(curr.amount), 0);
      const recipientCount = item.vout.length;
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
      const { height, id } = await this.getRepository()
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
    return this.getRepository().query(
      'SELECT height FROM Block b WHERE id NOT IN (SELECT previousBlockHash FROM Block WHERE height = CAST(b.height AS INT) + 1)',
      [],
    );
  }

  async getBlockByHash(hash: string) {
    const block = await this.getRepository().findOne({
      where: [
        {
          id: hash,
        },
      ],
    });
    return block;
  }

  async deleteBlockByHash(hash: string): Promise<DeleteResult> {
    return await this.getRepository()
      .createQueryBuilder()
      .delete()
      .from(BlockEntity)
      .where('id = :hash', { hash })
      .execute();
  }

  async getLastTimeOfBlock(): Promise<number> {
    const results = await this.getRepository()
      .createQueryBuilder('block')
      .select('MAX(block.timestamp) as time')
      .getRawOne();
    return results?.time;
  }

  async getLastData(
    sql: string,
    period: TPeriod,
    timestampField = 'timestamp',
    timestampAlias = 'label',
    sizeField = 'value',
    isSelectAll = false,
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
    if (['1h', '3h', '6h', '12h'].indexOf(period) !== -1) {
      groupBy = '';
    }
    if (isSelectAll) {
      return await this.getRepository()
        .createQueryBuilder()
        .select('*')
        .where({
          timestamp: Between(target / 1000, items[0].timestamp),
        })
        .groupBy(groupBy)
        .orderBy('timestamp', 'ASC')
        .getRawMany();
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
}

export default new BlockService();
