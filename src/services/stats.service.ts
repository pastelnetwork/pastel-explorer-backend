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
  gigaHashPerSec: TItemProps[];
  difficulty: TItemProps[];
  coinSupply: TItemProps[];
  usdPrice: TPriceProps[];
  nonZeroAddressesCount: TItemProps[];
  avgTransactionsPerSecond: TItemProps[];
  avgBlockSizeLast24Hour: TItemProps[];
  avgTransactionPerBlockLast24Hour: TItemProps[];
  avgTransactionFeeLast24Hour: TItemProps[];
  memPoolSize: TItemProps[];
  circulatingSupply: TItemProps[];
  percentPSLStaked: TItemProps[];
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
  async getLatest(): Promise<
    | (StatsEntity & { circulatingSupply: number; percentPSLStaked: number; })
    | null
  > {
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
          ...items[0],
          circulatingSupply: getCoinCirculatingSupply(
            pslStaked,
            items[0].coinSupply - (items[0].totalBurnedPSL || totalBurnedPSL),
          ),
          percentPSLStaked: getPercentPSLStaked(
            pslStaked,
            items[0].coinSupply - (items[0].totalBurnedPSL || totalBurnedPSL),
          ),
        }
      : null;
  }

  async getDayAgo(): Promise<
    | (StatsEntity & { circulatingSupply: number; percentPSLStaked: number; })
    | null
  > {
    const lastDayTimestamp = Date.now() - 1000 * 60 * 60 * 24;
    const items = await this.getRepository().find({
      order: { timestamp: 'ASC' },
      where: {
        timestamp: MoreThanOrEqual(lastDayTimestamp),
      },
      take: 1,
    });
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
          circulatingSupply: getCoinCirculatingSupply(
            pslStaked,
            items[0].coinSupply - items[0].totalBurnedPSL,
          ),
          percentPSLStaked: getPercentPSLStaked(
            total * getTheNumberOfTotalSupernodes(),
            itemLast30d[0].coinSupply - itemLast30d[0].totalBurnedPSL,
          ),
        }
      : null;
  }

  async getSummaryChartData(): Promise<TLast14DaysProps | null> {
    const gigaHashPerSec = [];
    const difficulty = [];
    const coinSupply = [];
    const usdPrice = [];
    const nonZeroAddressesCount = [];
    const avgTransactionsPerSecond = [];
    const avgBlockSizeLast24Hour = [];
    const avgTransactionPerBlockLast24Hour = [];
    const avgTransactionFeeLast24Hour = [];
    const memPoolSize = [];
    const circulatingSupply = [];
    const percentPSLStaked = [];

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
        value: i === items.length - 1 ? item.minCoinSupply : item.coinSupply,
      });
      usdPrice.push({
        time,
        usdPrice: i === items.length - 1 ? item.minUsdPrice : item.usdPrice,
        btcPrice: i === items.length - 1 ? item.minBtcPrice : item.btcPrice,
      });
      nonZeroAddressesCount.push({
        time,
        value:
          i === items.length - 1
            ? item.minNonZeroAddressesCount
            : item.nonZeroAddressesCount,
      });
      avgTransactionsPerSecond.push({
        time,
        value:
          i === items.length - 1
            ? item.minavgTransactionsPerSecond
            : item.avgTransactionsPerSecond,
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
      avgTransactionFeeLast24Hour.push({
        time,
        value:
          i === items.length - 1
            ? item.minAvgTransactionFeeLast24Hour
            : item.avgTransactionFeeLast24Hour,
      });
      memPoolSize.push({
        time,
        value: i === items.length - 1 ? item.minMemPoolSize : item.memPoolSize,
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
      const date = dayjs().subtract(i * 2, 'day');
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
      usdPrice: usdPrice.sort((a, b) => a.time - b.time),
      nonZeroAddressesCount: nonZeroAddressesCount.sort(
        (a, b) => a.time - b.time,
      ),
      avgTransactionsPerSecond: avgTransactionsPerSecond.sort(
        (a, b) => a.time - b.time,
      ),
      avgBlockSizeLast24Hour: avgBlockSizeLast24Hour.sort(
        (a, b) => a.time - b.time,
      ),
      avgTransactionPerBlockLast24Hour: avgTransactionPerBlockLast24Hour.sort(
        (a, b) => a.time - b.time,
      ),
      avgTransactionFeeLast24Hour: avgTransactionFeeLast24Hour.sort(
        (a, b) => a.time - b.time,
      ),
      memPoolSize: memPoolSize.sort((a, b) => a.time - b.time),
      circulatingSupply: circulatingSupply.sort((a, b) => a.time - b.time),
      percentPSLStaked: percentPSLStaked.sort((a, b) => a.time - b.time),
    };
  }
  // async getStats(): Promise<StatsEntity | null> {
  //   const items = await this.getRepository().
  // }
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
    const items = await this.getRepository().find({
      order: { timestamp: 'DESC' },
      where: {
        timestamp: LessThanOrEqual(date),
      },
      take: 1,
    });
    return items.length === 1
      ? items[0].coinSupply - items[0].totalBurnedPSL
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
