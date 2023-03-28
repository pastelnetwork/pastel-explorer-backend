import dayjs from 'dayjs';
import {
  Between,
  getRepository,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { StatsEntity } from '../entity/stats.entity';
import {
  averageFilterByDailyPeriodQuery,
  averageFilterByMonthlyPeriodQuery,
  periodGroupByHourly,
  Y,
} from '../utils/constants';
import {
  generatePrevTimestamp,
  getSqlTextByPeriod,
  getTheNumberOfTotalSupernodes,
} from '../utils/helpers';
import {
  marketPeriodData,
  marketPeriodMonthData,
  TPeriod,
} from '../utils/period';
import { getChartData } from './chartData.service';
import masternodeService from './masternode.service';

type TItemProps = {
  time: number;
  value: number;
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
    const masternodeData = await masternodeService.getAllMasternodeCreated();
    const pslStaked = masternodeData.length * getTheNumberOfTotalSupernodes();
    const items = await this.getRepository()
      .createQueryBuilder()
      .select('id')
      .addSelect('Max(difficulty)', 'difficulty')
      .addSelect('Min(difficulty)', 'minDifficulty')
      .addSelect('Max(gigaHashPerSec)', 'gigaHashPerSec')
      .addSelect('Min(gigaHashPerSec)', 'minGigaHashPerSec')
      .addSelect('Max(nonZeroAddressesCount)', 'nonZeroAddressesCount')
      .addSelect('Min(nonZeroAddressesCount)', 'minNonZeroAddressesCount')
      .addSelect('Max(coinSupply)', 'coinSupply')
      .addSelect('Min(coinSupply)', 'minCoinSupply')
      .addSelect('Max(avgBlockSizeLast24Hour)', 'avgBlockSizeLast24Hour')
      .addSelect('Min(avgBlockSizeLast24Hour)', 'minAvgBlockSizeLast24Hour')
      .addSelect(
        'Max(avgTransactionPerBlockLast24Hour)',
        'avgTransactionPerBlockLast24Hour',
      )
      .addSelect(
        'Min(avgTransactionPerBlockLast24Hour)',
        'minAvgTransactionPerBlockLast24Hour',
      )
      .addSelect('Max(timestamp)', 'maxTime')
      .addSelect('Min(timestamp)', 'minTime')
      .addSelect('Max(totalBurnedPSL)', 'totalBurnedPSL')
      .addSelect('Min(totalBurnedPSL)', 'minTotalBurnedPSL')
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
      const isLastItem = i === items.length - 1;
      const time = isLastItem ? item.minTime : item.maxTime;
      gigaHashPerSec.push({
        time,
        value: isLastItem ? item.minGigaHashPerSec : item.gigaHashPerSec,
      });
      difficulty.push({
        time,
        value: isLastItem ? item.minDifficulty : item.difficulty,
      });
      coinSupply.push({
        time,
        value: isLastItem
          ? item.minCoinSupply - (item.minTotalBurnedPSL || totalBurnedPSL)
          : item.coinSupply - (item.totalBurnedPSL || totalBurnedPSL),
      });
      nonZeroAddressesCount.push({
        time,
        value: isLastItem
          ? item.minNonZeroAddressesCount
          : item.nonZeroAddressesCount,
      });
      avgBlockSizeLast24Hour.push({
        time,
        value: isLastItem
          ? item.minAvgBlockSizeLast24Hour
          : item.avgBlockSizeLast24Hour,
      });
      avgTransactionPerBlockLast24Hour.push({
        time,
        value: isLastItem
          ? item.minAvgTransactionPerBlockLast24Hour
          : item.avgTransactionPerBlockLast24Hour,
      });
      circulatingSupply.push({
        time,
        value: getCoinCirculatingSupply(
          pslStaked,
          isLastItem
            ? item.minCoinSupply - (item.minTotalBurnedPSL || totalBurnedPSL)
            : item.coinSupply - (item.totalBurnedPSL || totalBurnedPSL),
        ),
      });
    }

    const prior32Date = dayjs()
      .hour(0)
      .minute(0)
      .second(0)
      .millisecond(0)
      .subtract(32, 'day');
    const statsData = await this.getRepository()
      .createQueryBuilder()
      .select('coinSupply, totalBurnedPSL, timestamp')
      .where('timestamp >= :timestamp', { timestamp: prior32Date.valueOf() })
      .orderBy('timestamp', 'DESC')
      .getRawMany();
    for (let i = 0; i <= 15; i++) {
      const date = dayjs()
        .hour(0)
        .minute(0)
        .second(0)
        .millisecond(0)
        .subtract(i * 2, 'day');
      const total =
        masternodeData.filter(m => m.masternodecreated <= date.valueOf() / 1000)
          .length || 1;
      const itemsPSLStaked = statsData.find(s => s.timestamp <= date.valueOf());
      percentPSLStaked.push({
        time: date.valueOf(),
        value: getPercentPSLStaked(
          total * getTheNumberOfTotalSupernodes(),
          itemsPSLStaked?.coinSupply -
            (itemsPSLStaked?.totalBurnedPSL || totalBurnedPSL),
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

  async getCurrentStats() {
    return await this.getRepository()
      .createQueryBuilder()
      .select('usdPrice, coinSupply')
      .orderBy('timestamp', 'DESC')
      .getRawOne();
  }

  async getAllForHistoricalStatistics(
    offset: number,
    limit: number,
    orderBy: keyof StatsEntity,
    orderDirection: 'DESC' | 'ASC',
    select: string,
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
      select,
      startTime,
    });
  }

  async getTotalBurned(period: TPeriod) {
    const { prevWhereSqlText, whereSqlText } = getSqlTextByPeriod({
      period,
      isMicroseconds: true,
    });

    let startValue = 0;
    const data = await this.getRepository()
      .createQueryBuilder()
      .select('totalBurnedPSL', 'value')
      .addSelect(
        "CAST(strftime('%s', strftime('%Y-%m-%dT00:00:00+00:00', datetime(timestamp / 1000, 'unixepoch'))) AS INT) * 1000",
        'time',
      )
      .where(whereSqlText ? whereSqlText : 'timestamp > 0')
      .groupBy(
        averageFilterByDailyPeriodQuery.replace(
          'timestamp',
          'timestamp / 1000',
        ),
      )
      .orderBy('timestamp')
      .getRawMany();

    if (prevWhereSqlText) {
      const startItemValue = await this.getRepository()
        .createQueryBuilder()
        .select('totalBurnedPSL')
        .andWhere(prevWhereSqlText)
        .orderBy('timestamp', 'DESC')
        .getRawOne();

      startValue = startItemValue?.total || 0;
    }

    if (!data.length) {
      const lastItem = await this.getRepository()
        .createQueryBuilder()
        .select('timestamp')
        .orderBy('timestamp', 'DESC')
        .getRawOne();

      if (lastItem?.timestamp) {
        const startTime = generatePrevTimestamp(lastItem.timestamp, period);
        const { prevWhereSqlText } = getSqlTextByPeriod({
          period,
          isMicroseconds: true,
          startTime,
        });
        if (prevWhereSqlText) {
          const startItemValue = await this.getRepository()
            .createQueryBuilder()
            .select('totalBurnedPSL')
            .andWhere(prevWhereSqlText)
            .orderBy('timestamp', 'DESC')
            .getRawOne();
          startValue = startItemValue?.total || 0;
        }
      }
    }

    const result = [];
    let startBalance = startValue;
    if (!['max', 'all'].includes(period)) {
      for (let i = marketPeriodData[period] - 1; i >= 0; i--) {
        const date = dayjs().subtract(i, 'day');
        const item = data.find(
          d => dayjs(d.time).format('YYYYMMDD') === date.format('YYYYMMDD'),
        );
        if (!item) {
          const items = data.filter(d => d.time < date.valueOf());
          result.push({
            time: date.valueOf(),
            value: items.length ? items[items.length - 1].value : startBalance,
          });
        } else if (item.time) {
          result.push({
            time: item.time,
            value: item.value < startBalance ? startBalance : item.value,
          });
          if (item.value > startBalance) {
            startBalance = item.value;
          }
        }
      }
    } else {
      if (data.length) {
        result.push({
          time: dayjs(data[0].time).subtract(1, 'day').valueOf(),
          value: 0,
        });
      }

      for (let i = 0; i < data.length; i++) {
        result.push({
          time: data[i].time,
          value: data[i].value < startBalance ? startBalance : data[i].value,
        });
        if (data[i].value > startBalance) {
          startBalance = data[i].value;
        }
      }
    }

    return result;
  }

  async getBurnedByMonth(period: TPeriod) {
    const { prevWhereSqlText, whereSqlText } = getSqlTextByPeriod({
      period,
      isMicroseconds: true,
    });

    let startValue = 0;
    const data = await this.getRepository()
      .createQueryBuilder()
      .select('MAX(totalBurnedPSL)', 'value')
      .addSelect(
        "CAST(strftime('%s', strftime('%Y-%m-%dT00:00:00+00:00', datetime(timestamp / 1000, 'unixepoch'))) AS INT) * 1000",
        'time',
      )
      .where(whereSqlText ? whereSqlText : 'timestamp > 0')
      .groupBy(
        averageFilterByMonthlyPeriodQuery.replace(
          'timestamp',
          'timestamp / 1000',
        ),
      )
      .orderBy('timestamp')
      .getRawMany();
    if (prevWhereSqlText) {
      const startItemValue = await this.getRepository()
        .createQueryBuilder()
        .select('totalBurnedPSL')
        .andWhere(prevWhereSqlText)
        .orderBy('timestamp', 'DESC')
        .getRawOne();
      startValue = startItemValue?.total || 0;
    }

    let result = [];
    const getData = month => {
      const items = [];
      for (let i = month; i >= 0; i--) {
        const date = dayjs().subtract(i, 'month');
        const item = data.find(
          d => dayjs(d.time).format('YYYYMM') === date.format('YYYYMM'),
        );
        if (!item) {
          items.push({
            time: date.valueOf(),
            value: 0,
          });
        } else if (item.time) {
          const value = item.value - startValue;
          items.push({
            time: item.time,
            value: value < 0 ? 0 : value,
          });
          startValue = item.value;
        }
      }

      return items;
    };
    if (!['max', 'all'].includes(period)) {
      result = getData(marketPeriodMonthData[period] - 1);
    } else if (data.length) {
      const month = dayjs().diff(data[0].time, 'month');
      startValue = 0;
      result = getData(month);
    }

    return result;
  }
}

export default new StatsService();
