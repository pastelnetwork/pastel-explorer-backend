import dayjs from 'dayjs';
import {
  Between,
  getRepository,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { StatsEntity } from '../entity/stats.entity';
import { periodGroupByHourly, Y } from '../utils/constants';
import {
  generatePrevTimestamp,
  getTheNumberOfTotalSupernodes,
} from '../utils/helpers';
import { TPeriod } from '../utils/period';
import { getChartData } from './chartData.service';
import masternodeService from './masternode.service';

type TItemProps = {
  time: number;
  value: number;
};

type TPriceProps = {
  time: number;
  usdPrice: number;
  btcPrice: number;
};

type TLast14DaysProps = {
  circulatingSupply: TItemProps[];
  coinSupply: TItemProps[];
  percentPSLStaked: TItemProps[];
  nonZeroAddressesCount: TItemProps[];
  gigaHashPerSec: TItemProps[];
  difficulty: TItemProps[];
  avgBlockSizeLast24Hour: TItemProps[];
  avgTransactionPerBlockLast24Hour: TItemProps[];
};

export const getCoinCirculatingSupply = (
  pslStaked: number,
  coinSupplyValue: number,
): number => {
  return coinSupplyValue - pslStaked - Y;
};

export const getPercentPSLStaked = (
  pslStaked: number,
  coinSupplyValue: number,
): number => {
  const coinCirculatingSupply = getCoinCirculatingSupply(
    pslStaked,
    coinSupplyValue,
  );
  return pslStaked / (coinCirculatingSupply + pslStaked);
};

class StatsService {
  private getRepository(): Repository<StatsEntity> {
    return getRepository(StatsEntity);
  }
  async getLatest(): Promise<{
    circulatingSupply: number;
    percentPSLStaked: number;
    totalCoinSupply: number;
    pslLockedByFoundation: number;
    nonZeroAddressesCount: number;
    gigaHashPerSec: string;
    difficulty: number;
    avgBlockSizeLast24Hour: number;
    avgTransactionPerBlockLast24Hour: number;
    totalBurnedPSL: number;
    coinSupply: number;
    blockHeight: number;
  } | null> {
    const items = await this.getRepository().find({
      order: { timestamp: 'DESC' },
      take: 1,
    });
    const pslStaked =
      (await masternodeService.countFindAll()) *
      getTheNumberOfTotalSupernodes();
    const totalBurnedPSL = await this.getStartTotalBurned();
    return items.length === 1
      ? {
          nonZeroAddressesCount: items[0].nonZeroAddressesCount,
          gigaHashPerSec: items[0].gigaHashPerSec,
          difficulty: items[0].difficulty,
          blockHeight: items[0].blockHeight,
          avgBlockSizeLast24Hour: items[0].avgBlockSizeLast24Hour,
          avgTransactionPerBlockLast24Hour:
            items[0].avgTransactionPerBlockLast24Hour,
          totalBurnedPSL: items[0].totalBurnedPSL,
          coinSupply:
            items[0].coinSupply - (items[0].totalBurnedPSL || totalBurnedPSL),
          totalCoinSupply: items[0].coinSupply,
          circulatingSupply: getCoinCirculatingSupply(
            pslStaked,
            items[0].coinSupply - (items[0].totalBurnedPSL || totalBurnedPSL),
          ),
          percentPSLStaked: getPercentPSLStaked(
            pslStaked,
            items[0].coinSupply - (items[0].totalBurnedPSL || totalBurnedPSL),
          ),
          pslLockedByFoundation: Y,
        }
      : null;
  }

  async getDayAgo(): Promise<{
    circulatingSupply: number;
    percentPSLStaked: number;
    nonZeroAddressesCount: number;
    gigaHashPerSec: string;
    difficulty: number;
    avgBlockSizeLast24Hour: number;
    avgTransactionPerBlockLast24Hour: number;
    totalBurnedPSL: number;
    coinSupply: number;
  } | null> {
    const lastDayTimestamp = Date.now() - 1000 * 60 * 60 * 24;
    const items = await this.getRepository().find({
      order: { timestamp: 'ASC' },
      where: {
        timestamp: MoreThanOrEqual(lastDayTimestamp),
      },
      take: 1,
    });
    const totalBurnedPSL = await this.getStartTotalBurned();
    const itemLast30d = await this.getRepository().find({
      order: { timestamp: 'ASC' },
      where: {
        timestamp: MoreThanOrEqual(dayjs().subtract(30, 'day').valueOf()),
      },
      take: 1,
    });
    const pslStaked =
      (await masternodeService.countFindAll()) *
      getTheNumberOfTotalSupernodes();
    const total =
      (await masternodeService.countFindByData(
        dayjs().subtract(30, 'day').valueOf() / 1000,
      )) || 1;
    return items.length === 1
      ? {
          ...items[0],
          nonZeroAddressesCount: items[0].nonZeroAddressesCount,
          gigaHashPerSec: items[0].gigaHashPerSec,
          difficulty: items[0].difficulty,
          avgBlockSizeLast24Hour: items[0].avgBlockSizeLast24Hour,
          avgTransactionPerBlockLast24Hour:
            items[0].avgTransactionPerBlockLast24Hour,
          coinSupply:
            items[0].coinSupply - (items[0].totalBurnedPSL || totalBurnedPSL),
          circulatingSupply: getCoinCirculatingSupply(
            pslStaked,
            items[0].coinSupply - (items[0].totalBurnedPSL || totalBurnedPSL),
          ),
          percentPSLStaked: getPercentPSLStaked(
            total * getTheNumberOfTotalSupernodes(),
            itemLast30d[0].coinSupply -
              (itemLast30d[0].totalBurnedPSL || totalBurnedPSL),
          ),
        }
      : null;
  }

  async getSummaryChartData(): Promise<TLast14DaysProps | null> {
    const circulatingSupply = [];
    const coinSupply = [];
    const percentPSLStaked = [];
    const nonZeroAddressesCount = [];
    const gigaHashPerSec = [];
    const difficulty = [];
    const avgBlockSizeLast24Hour = [];
    const avgTransactionPerBlockLast24Hour = [];
    const pslStaked =
      (await masternodeService.countFindAll()) *
      getTheNumberOfTotalSupernodes();
    const items = await this.getRepository()
      .createQueryBuilder()
      .select(
        'id, Max(difficulty) AS difficulty, Min(difficulty) AS minDifficulty, Max(gigaHashPerSec) AS gigaHashPerSec, Min(gigaHashPerSec) AS minGigaHashPerSec, Max(nonZeroAddressesCount) AS nonZeroAddressesCount, Min(nonZeroAddressesCount) AS minNonZeroAddressesCount, Max(avgTransactionsPerSecond) AS avgTransactionsPerSecond, Min(avgTransactionsPerSecond) AS minAvgTransactionsPerSecond, Max(coinSupply) AS coinSupply, Min(coinSupply) AS minCoinSupply, Max(btcPrice) AS btcPrice, Min(btcPrice) AS minBtcPrice, Max(usdPrice) AS usdPrice, Min(usdPrice) AS minUsdPrice, Max(marketCapInUSD) AS marketCapInUSD, Min(marketCapInUSD) AS minMarketCapInUSD, Max(transactions) AS transactions, Min(transactions) AS minTransactions, Max(avgBlockSizeLast24Hour) AS avgBlockSizeLast24Hour, Min(avgBlockSizeLast24Hour) AS minAvgBlockSizeLast24Hour, Max(avgTransactionPerBlockLast24Hour) AS avgTransactionPerBlockLast24Hour, Min(avgTransactionPerBlockLast24Hour) AS minAvgTransactionPerBlockLast24Hour, Max(avgTransactionFeeLast24Hour) AS avgTransactionFeeLast24Hour, Min(avgTransactionFeeLast24Hour) AS minAvgTransactionFeeLast24Hour, Max(memPoolSize) AS memPoolSize, Min(memPoolSize) AS minMemPoolSize, Max(timestamp) AS maxTime, Min(timestamp) AS minTime, Max(totalBurnedPSL) AS totalBurnedPSL, Min(totalBurnedPSL) AS minTotalBurnedPSL',
      )
      .where('timestamp >= :timestamp', {
        timestamp: dayjs().subtract(24, 'hour').valueOf(),
      })
      .groupBy(
        "strftime('%H %m/%d/%Y', datetime(timestamp / 1000, 'unixepoch'))",
      )
      .orderBy('timestamp', 'DESC')
      .getRawMany();

    const totalBurnedPSL = await this.getStartTotalBurned();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const time = i === items.length - 1 ? item.minTime : item.maxTime;
      gigaHashPerSec.push({
        time,
        value:
          i === items.length - 1 ? item.minGigaHashPerSec : item.gigaHashPerSec,
      });
      difficulty.push({
        time,
        value: i === items.length - 1 ? item.minDifficulty : item.difficulty,
      });
      coinSupply.push({
        time,
        value:
          i === items.length - 1
            ? item.minCoinSupply - (item.minTotalBurnedPSL || totalBurnedPSL)
            : item.coinSupply - (item.totalBurnedPSL || totalBurnedPSL),
      });
      nonZeroAddressesCount.push({
        time,
        value:
          i === items.length - 1
            ? item.minNonZeroAddressesCount
            : item.nonZeroAddressesCount,
      });
      avgBlockSizeLast24Hour.push({
        time,
        value:
          i === items.length - 1
            ? item.minAvgBlockSizeLast24Hour
            : item.avgBlockSizeLast24Hour,
      });
      avgTransactionPerBlockLast24Hour.push({
        time,
        value:
          i === items.length - 1
            ? item.minAvgTransactionPerBlockLast24Hour
            : item.avgTransactionPerBlockLast24Hour,
      });
      circulatingSupply.push({
        time,
        value: getCoinCirculatingSupply(
          pslStaked,
          i === items.length - 1
            ? item.minCoinSupply - (item.minTotalBurnedPSL || totalBurnedPSL)
            : item.coinSupply - (item.totalBurnedPSL || totalBurnedPSL),
        ),
      });
    }

    for (let i = 0; i <= 15; i++) {
      const date = dayjs()
        .hour(0)
        .minute(0)
        .second(0)
        .millisecond(0)
        .subtract(i * 2, 'day');
      const total =
        (await masternodeService.countFindByData(date.valueOf() / 1000)) || 1;
      const itemsPSLStaked = await this.getRepository().find({
        order: { timestamp: 'DESC' },
        where: {
          timestamp: LessThanOrEqual(date.valueOf()),
        },
        take: 1,
      });
      percentPSLStaked.push({
        time: date.valueOf(),
        value: getPercentPSLStaked(
          total * getTheNumberOfTotalSupernodes(),
          itemsPSLStaked?.[0]?.coinSupply -
            (itemsPSLStaked?.[0]?.totalBurnedPSL || totalBurnedPSL),
        ),
      });
    }

    return {
      gigaHashPerSec: gigaHashPerSec.sort((a, b) => a.time - b.time),
      difficulty: difficulty.sort((a, b) => a.time - b.time),
      coinSupply: coinSupply.sort((a, b) => a.time - b.time),
      nonZeroAddressesCount: nonZeroAddressesCount.sort(
        (a, b) => a.time - b.time,
      ),
      avgBlockSizeLast24Hour: avgBlockSizeLast24Hour.sort(
        (a, b) => a.time - b.time,
      ),
      avgTransactionPerBlockLast24Hour: avgTransactionPerBlockLast24Hour.sort(
        (a, b) => a.time - b.time,
      ),
      circulatingSupply: circulatingSupply.sort((a, b) => a.time - b.time),
      percentPSLStaked: percentPSLStaked.sort((a, b) => a.time - b.time),
    };
  }

  async getAll(
    offset: number,
    limit: number,
    orderBy: keyof StatsEntity,
    orderDirection: 'DESC' | 'ASC',
    period?: TPeriod,
    startTime?: number,
  ) {
    return getChartData<StatsEntity>({
      offset,
      limit,
      orderBy,
      orderDirection,
      period,
      repository: this.getRepository(),
      isMicroseconds: true,
      isGroupBy: periodGroupByHourly.includes(period) ? true : false,
      select: '*',
      startTime,
    });
  }

  async getCoinSupply() {
    const items = await this.getRepository().find({
      order: { timestamp: 'DESC' },
      take: 1,
    });
    return items.length === 1
      ? items[0].coinSupply - items[0].totalBurnedPSL
      : 0;
  }

  async getCoinSupplyByDate(date: number) {
    const totalBurnedPSL = await this.getStartTotalBurned();
    const items = await this.getRepository().find({
      order: { timestamp: 'DESC' },
      where: {
        timestamp: LessThanOrEqual(date),
      },
      take: 1,
    });
    return items.length === 1
      ? items[0].coinSupply - (items[0].totalBurnedPSL || totalBurnedPSL)
      : 0;
  }

  async getStartDate() {
    const items = await this.getRepository().find({
      order: { timestamp: 'ASC' },
      take: 1,
    });
    return items.length === 1 ? items[0].timestamp : 0;
  }

  async getLastData(period: TPeriod) {
    const items = await this.getRepository().find({
      order: { timestamp: 'DESC' },
      take: 1,
    });
    const target = generatePrevTimestamp(items[0].timestamp, period);
    let groupBy = '';
    if (periodGroupByHourly.includes(period)) {
      groupBy =
        "strftime('%H %m/%d/%Y', datetime(timestamp / 1000, 'unixepoch'))";
    }

    return await this.getRepository()
      .createQueryBuilder()
      .select('*')
      .where({
        timestamp: Between(target, items[0].timestamp),
      })
      .groupBy(groupBy)
      .orderBy('timestamp', 'ASC')
      .getRawMany();
  }

  async getLastTotalBurned() {
    const item = await this.getRepository()
      .createQueryBuilder()
      .select('totalBurnedPSL')
      .where('totalBurnedPSL > 0')
      .orderBy('timestamp', 'DESC')
      .limit(1)
      .getRawOne();
    return item?.totalBurnedPSL || 0;
  }

  async getStartTotalBurned() {
    const item = await this.getRepository()
      .createQueryBuilder()
      .select('totalBurnedPSL')
      .where('totalBurnedPSL > 0')
      .orderBy('timestamp', 'ASC')
      .limit(1)
      .getRawOne();
    return item?.totalBurnedPSL || 0;
  }
}

export default new StatsService();
