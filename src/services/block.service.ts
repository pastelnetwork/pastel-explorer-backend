import {
  Between,
  getRepository,
  ILike,
  Like,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { BlockEntity } from '../entity/block.entity';
import { BatchAddressEvents } from '../scripts/seed-blockchain-data/update-database';
import { getSqlTextByPeriodGranularity } from '../utils/helpers';
import { getStartPoint, TGranularity, TPeriod } from '../utils/period';
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
    return { ...block, confirmations: highest - Number(block.height) };
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
    const blocks = await this.getRepository().find({
      where: {
        timestamp: Between(from / 1000, new Date().getTime() / 1000),
      },
    });
    return blocks;
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
    const { height } = await this.getRepository()
      .createQueryBuilder('block')
      .select('MAX(block.timestamp), height')
      .getRawOne();
    return Number(height);
  }

  async getStatisticsBlocks(
    offset: number,
    limit: number,
    orderBy: keyof BlockEntity,
    orderDirection: 'DESC' | 'ASC',
    period: TPeriod,
  ): Promise<BlockEntity[]> {
    return getChartData<BlockEntity>({
      offset,
      limit,
      orderBy,
      orderDirection,
      period,
      repository: this.getRepository(),
      isMicroseconds: false,
    });
  }
  async getAverageBlockSizeStatistics(
    period: TPeriod,
    granularity: TGranularity,
  ) {
    const { groupBy, whereSqlText } = getSqlTextByPeriodGranularity(
      period,
      granularity,
    );
    const data = await this.getRepository()
      .createQueryBuilder('block')
      .select([])
      .addSelect(groupBy, 'time')
      .addSelect('AVG(size)', 'size')
      .where(whereSqlText)
      .groupBy(groupBy)
      .getRawMany();
    return data;
  }

  async getBlocksInfo(
    sqlQuery: string,
    period: TPeriod,
    granularity: TGranularity,
  ) {
    const { groupBy, whereSqlText } = getSqlTextByPeriodGranularity(
      period,
      granularity,
    );
    return await this.getRepository()
      .createQueryBuilder()
      .select(groupBy, 'label')
      .addSelect(`round(${sqlQuery}, 2)`, 'value')
      .where(whereSqlText)
      .groupBy(groupBy)
      .getRawMany();
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
        item.time,
        coinbase,
        totalAmount,
        recipientCount,
        rawData,
        isNonStandard,
        unconfirmedTransactionDetails,
        item.size,
        item.fee,
        item.height,
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
    const { height, id } = await this.getRepository()
      .createQueryBuilder('block')
      .select('height, id')
      .where('previousBlockHash = :hash', { hash })
      .getRawOne();
    return {
      height: Number(height),
      id,
    };
  }

  async getBlockHeightUnCorrect(): Promise<{ height: number; }[]> {
    return this.getRepository().query(
      'SELECT height FROM Block b WHERE id NOT IN (SELECT previousBlockHash FROM Block WHERE height = CAST(b.height AS INT) + 1)',
      [],
    );
  }
}

export default new BlockService();
