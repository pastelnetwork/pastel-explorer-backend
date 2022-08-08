import { getRepository, MoreThanOrEqual, Repository } from 'typeorm';

import { StatsEntity } from '../entity/stats.entity';
import { fiveMillion, Y } from '../utils/constants';
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

const getCoinCirculatingSupply = (
  pslStaked: number,
  coinSupplyValue: number,
) => {
  return coinSupplyValue - pslStaked - Y;
};

const getPercentPSLStaked = (pslStaked: number, coinSupplyValue: number) => {
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
    return items.length === 1
      ? {
          ...items[0],
          circulatingSupply: getCoinCirculatingSupply(
            pslStaked,
            items[0].coinSupply,
          ),
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
    const pslStaked = (await masternodeService.countFindAll()) * fiveMillion;
    return items.length === 1
      ? {
          ...items[0],
          circulatingSupply: getCoinCirculatingSupply(
            pslStaked,
            items[0].coinSupply,
          ),
          percentPSLStaked: getPercentPSLStaked(pslStaked, items[0].coinSupply),
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

    const items = await this.getRepository().find({
      order: { timestamp: 'DESC' },
      take: 14,
    });

    if (items.length) {
      for (const item of items.sort((a, b) => a.timestamp - b.timestamp)) {
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
          value: getCoinCirculatingSupply(pslStaked, item.coinSupply),
        });
        percentPSLStaked.push({
          time: item.timestamp,
          value: getPercentPSLStaked(pslStaked, item.coinSupply),
        });
      }
    }

    return {
      gigaHashPerSec,
      difficulty,
      coinSupply,
      usdPrice,
      nonZeroAddressesCount,
      avgTransactionsPerSecond,
      avgBlockSizeLast24Hour,
      avgTransactionPerBlockLast24Hour,
      avgTransactionFeeLast24Hour,
      memPoolSize,
      circulatingSupply,
      percentPSLStaked,
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
  ) {
    return getChartData<StatsEntity>({
      offset,
      limit,
      orderBy,
      orderDirection,
      period,
      repository: this.getRepository(),
    });
  }

  async getCoinSupply() {
    const items = await this.getRepository().find({
      order: { timestamp: 'DESC' },
      take: 1,
    });
    return items.length === 1 ? items[0].coinSupply : 0;
  }
}

export default new StatsService();
