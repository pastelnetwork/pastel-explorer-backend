import dayjs from 'dayjs';
import {
  Between,
  getRepository,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { StatsEntity } from '../entity/stats.entity';
import { fiveMillion, periodGroupByHourly, Y } from '../utils/constants';
import { generatePrevTimestamp } from '../utils/helpers';
import { TPeriod } from '../utils/period';
import addressEventsService from './address-events.service';
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
    const pslStaked = (await masternodeService.countFindAll()) * fiveMillion;
    const incomingSum = await addressEventsService.sumAllEventsAmount(
      process.env.PASTEL_BURN_ADDRESS,
      'Incoming' as TransferDirectionEnum,
    );
    return items.length === 1
      ? {
          ...items[0],
          circulatingSupply:
            getCoinCirculatingSupply(pslStaked, items[0].coinSupply) -
            incomingSum,
          percentPSLStaked: getPercentPSLStaked(pslStaked, items[0].coinSupply),
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
    const pslStaked = (await masternodeService.countFindAll()) * fiveMillion;
    const incomingSum = await addressEventsService.sumAllEventsAmount(
      process.env.PASTEL_BURN_ADDRESS,
      'Incoming' as TransferDirectionEnum,
    );
    const total =
      (await masternodeService.countFindByData(
        dayjs().subtract(30, 'day').valueOf() / 1000,
      )) || 1;
    return items.length === 1
      ? {
          ...items[0],
          circulatingSupply:
            getCoinCirculatingSupply(pslStaked, items[0].coinSupply) -
            incomingSum,
          percentPSLStaked: getPercentPSLStaked(
            total * fiveMillion,
            itemLast30d[0].coinSupply,
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

    const pslStaked = (await masternodeService.countFindAll()) * fiveMillion;

    const incomingSum = await addressEventsService.sumAllEventsAmount(
      process.env.PASTEL_BURN_ADDRESS,
      'Incoming' as TransferDirectionEnum,
    );

    const items = await this.getRepository()
      .createQueryBuilder()
      .select('*')
      .where('timestamp >= :timestamp', {
        timestamp: dayjs().subtract(24, 'hour').valueOf(),
      })
      .groupBy(
        "strftime('%H %m/%d/%Y', datetime(timestamp / 1000, 'unixepoch'))",
      )
      .orderBy('timestamp', 'DESC')
      .getRawMany();

    if (items.length) {
      for (const item of items) {
        gigaHashPerSec.push({
          time: item.timestamp,
          value: item.gigaHashPerSec,
        });
        difficulty.push({
          time: item.timestamp,
          value: item.difficulty,
        });
        coinSupply.push({
          time: item.timestamp,
          value: item.coinSupply,
        });
        usdPrice.push({
          time: item.timestamp,
          usdPrice: item.usdPrice,
          btcPrice: item.btcPrice,
        });
        nonZeroAddressesCount.push({
          time: item.timestamp,
          value: item.nonZeroAddressesCount,
        });
        avgTransactionsPerSecond.push({
          time: item.timestamp,
          value: item.avgTransactionsPerSecond,
        });
        avgBlockSizeLast24Hour.push({
          time: item.timestamp,
          value: item.avgBlockSizeLast24Hour,
        });
        avgTransactionPerBlockLast24Hour.push({
          time: item.timestamp,
          value: item.avgTransactionPerBlockLast24Hour,
        });
        avgTransactionFeeLast24Hour.push({
          time: item.timestamp,
          value: item.avgTransactionFeeLast24Hour,
        });
        memPoolSize.push({
          time: item.timestamp,
          value: item.memPoolSize,
        });
        circulatingSupply.push({
          time: item.timestamp,
          value:
            getCoinCirculatingSupply(pslStaked, item.coinSupply) - incomingSum,
        });
      }
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
          total * fiveMillion,
          itemsPSLStaked?.[0]?.coinSupply,
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
    return items.length === 1 ? items[0].coinSupply : 0;
  }

  async getCoinSupplyByDate(date: number) {
    const items = await this.getRepository().find({
      order: { timestamp: 'DESC' },
      where: {
        timestamp: LessThanOrEqual(date),
      },
      take: 1,
    });
    return items.length === 1 ? items[0].coinSupply : 0;
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
}

export default new StatsService();
