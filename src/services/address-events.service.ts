import dayjs from 'dayjs';
import { DeleteResult, getRepository, Repository } from 'typeorm';

import { AddressEventEntity } from '../entity/address-event.entity';
import {
  averageFilterByDailyPeriodQuery,
  averageFilterByMonthlyPeriodQuery,
} from '../utils/constants';
import { generatePrevTimestamp, getSqlTextByPeriod } from '../utils/helpers';
import {
  marketPeriodData,
  marketPeriodMonthData,
  TPeriod,
} from '../utils/period';

class AddressEventsService {
  private getRepository(): Repository<AddressEventEntity> {
    return getRepository(AddressEventEntity);
  }
  async getTopBalanceRank(end = 100): Promise<{
    rank: AccountRankItem[];
    totalSum: number;
  }> {
    const rank = await this.getRepository()
      .createQueryBuilder('address')
      .select('address.address', 'account')
      .addSelect('SUM(address.amount)', 'sum')
      .groupBy('account')
      .getRawMany();
    return {
      rank: rank
        .filter(v => v.sum > 1)
        .sort((a, b) => b.sum - a.sum)
        .slice(0, end),
      totalSum: rank.reduce((acc, curr) => acc + curr.sum, 0),
    };
  }
  async getTopReceivedRank(): Promise<{
    rank: AccountRankItem[];
    totalSum: number;
  }> {
    const rank = await this.getRepository()
      .createQueryBuilder('address')
      .select('address.address', 'account')
      .addSelect('SUM(address.amount)', 'sum')
      .where('address.direction = :direction', {
        direction: 'Incoming' as TransferDirectionEnum,
      })
      .groupBy('account')
      .getRawMany();

    return {
      rank: rank
        .filter(v => v.sum > 1)
        .sort((a, b) => b.sum - a.sum)
        .slice(0, 100),
      totalSum: rank.reduce((acc, curr) => acc + curr.sum, 0),
    };
  }
  async searchByWalletAddress(searchParam: string) {
    return this.getRepository()
      .createQueryBuilder('wallet')
      .select('address')
      .where('wallet.address like :searchParam', {
        searchParam: `${searchParam}%`,
      })
      .distinct(true)
      .limit(10)
      .getRawMany();
  }
  async findAllByAddress({
    address,
    limit,
    offset,
    orderBy,
    orderDirection,
  }: {
    address: string;
    limit: number;
    offset: number;
    orderBy: keyof AddressEventEntity;
    orderDirection: 'DESC' | 'ASC';
  }) {
    return this.getRepository().find({
      where: {
        address,
      },
      select: ['amount', 'timestamp', 'transactionHash', 'direction'],
      take: limit,
      skip: offset,
      order: {
        [orderBy]: orderDirection,
      },
    });
  }
  async sumAllEventsAmount(address: string, direction: TransferDirectionEnum) {
    const { sum } = await this.getRepository()
      .createQueryBuilder('address')
      .select('SUM(address.amount)', 'sum')
      .where('address.address = :address and address.direction = :direction', {
        address,
        direction: direction as TransferDirectionEnum,
      })
      .getRawOne();
    return sum;
  }
  async findAllByTransactionHash(transactionHash: string) {
    return this.getRepository().find({
      where: {
        transactionHash: transactionHash,
      },
      select: ['amount', 'address', 'direction'],
    });
  }

  async findAllNonZeroAddresses() {
    return this.getRepository()
      .createQueryBuilder('address')
      .select('address.address', 'account')
      .addSelect('SUM(address.amount)', 'sum')
      .groupBy('account')
      .having('sum > 0')
      .getRawMany();
  }

  async deleteEventAndAddressByTransactionHash(
    transactionHash: string,
  ): Promise<DeleteResult> {
    return await this.getRepository()
      .createQueryBuilder()
      .delete()
      .from(AddressEventEntity)
      .where('transactionHash = :transactionHash', { transactionHash })
      .execute();
  }

  async updateAmount(
    amount: number,
    direction: string,
    address: string,
    transactionHash: string,
  ) {
    return await this.getRepository()
      .createQueryBuilder()
      .update({
        amount,
      })
      .where('address = :address', { address })
      .andWhere('direction = :direction', { direction })
      .andWhere('transactionHash = :transactionHash', { transactionHash })
      .execute();
  }

  async deleteEventAndAddressNotInTransaction(
    transactionHash: string,
    addresses: string[],
  ): Promise<DeleteResult> {
    return await this.getRepository()
      .createQueryBuilder()
      .delete()
      .from(AddressEventEntity)
      .where('transactionHash = :transactionHash', { transactionHash })
      .andWhere('address NOT IN (:...addresses)', { addresses })
      .execute();
  }

  async deleteAllByTxIds(txIds: string[]): Promise<DeleteResult> {
    return await this.getRepository()
      .createQueryBuilder()
      .delete()
      .from(AddressEventEntity)
      .where('transactionHash IN (:...txIds)', { txIds })
      .execute();
  }

  async getBalanceHistory(id: string, period: TPeriod) {
    const { prevWhereSqlText, whereSqlText } = getSqlTextByPeriod({
      period,
      isMicroseconds: false,
    });
    let startValue = 0;
    let startIncomingValue = 0;
    let startOutgoingValue = 0;

    if (prevWhereSqlText) {
      const startItemValue = await this.getRepository()
        .createQueryBuilder()
        .select('SUM(amount) as total')
        .where('address = :id', { id })
        .andWhere(prevWhereSqlText)
        .getRawOne();
      startValue = startItemValue?.total || 0;

      const startIncomingItemValue = await this.getRepository()
        .createQueryBuilder()
        .select('SUM(amount) as total')
        .where('address = :id', { id })
        .andWhere("direction = 'Incoming'")
        .andWhere(prevWhereSqlText)
        .getRawOne();
      startIncomingValue = startIncomingItemValue?.total || 0;

      const startOutgoingItemValue = await this.getRepository()
        .createQueryBuilder()
        .select('SUM(amount) * -1 as total')
        .where('address = :id', { id })
        .andWhere("direction = 'Outgoing'")
        .andWhere(prevWhereSqlText)
        .getRawOne();
      startOutgoingValue = startOutgoingItemValue?.total || 0;
    }
    const items = await this.getRepository()
      .createQueryBuilder()
      .select('SUM(amount)', 'total')
      .addSelect(
        "CAST(strftime('%s', strftime('%Y-%m-%dT00:00:00+00:00', datetime(timestamp, 'unixepoch'))) AS INT)",
        'timestamp',
      )
      .where('address = :id', { id })
      .andWhere(whereSqlText ? whereSqlText : 'timestamp > 0')
      .groupBy(averageFilterByDailyPeriodQuery)
      .orderBy('timestamp')
      .getRawMany();
    const incoming = await this.getRepository()
      .createQueryBuilder()
      .select('SUM(amount)', 'value')
      .addSelect(
        "CAST(strftime('%s', strftime('%Y-%m-%dT00:00:00+00:00', datetime(timestamp, 'unixepoch'))) AS INT) * 1000",
        'time',
      )
      .where('address = :id', { id })
      .andWhere("direction = 'Incoming'")
      .andWhere(whereSqlText ? whereSqlText : 'timestamp > 0')
      .groupBy(averageFilterByDailyPeriodQuery)
      .orderBy('timestamp')
      .getRawMany();
    const outgoing = await this.getRepository()
      .createQueryBuilder()
      .select('SUM(amount) * -1', 'value')
      .addSelect(
        "CAST(strftime('%s', strftime('%Y-%m-%dT00:00:00+00:00', datetime(timestamp, 'unixepoch'))) AS INT) * 1000",
        'time',
      )
      .where('address = :id', { id })
      .andWhere("direction = 'Outgoing'")
      .andWhere(whereSqlText ? whereSqlText : 'timestamp > 0')
      .groupBy(averageFilterByDailyPeriodQuery)
      .orderBy('timestamp')
      .getRawMany();

    if (!items.length || !incoming.length || !outgoing.length) {
      const lastItem = await this.getRepository()
        .createQueryBuilder()
        .select('timestamp')
        .orderBy('timestamp', 'DESC')
        .getRawOne();
      if (lastItem?.timestamp) {
        const startTime =
          generatePrevTimestamp(lastItem.timestamp * 1000, period) / 1000;
        const { prevWhereSqlText } = getSqlTextByPeriod({
          period,
          isMicroseconds: true,
          startTime,
        });

        if (prevWhereSqlText) {
          if (!items.length) {
            const startItemValue = await this.getRepository()
              .createQueryBuilder()
              .select('SUM(amount) as total')
              .where('address = :id', { id })
              .andWhere(prevWhereSqlText)
              .getRawOne();
            startValue = startItemValue?.total || 0;
          }

          if (!incoming.length) {
            const startIncomingItemValue = await this.getRepository()
              .createQueryBuilder()
              .select('SUM(amount) as total')
              .where('address = :id', { id })
              .andWhere("direction = 'Incoming'")
              .andWhere(prevWhereSqlText)
              .getRawOne();
            startIncomingValue = startIncomingItemValue?.total || 0;
          }

          if (!outgoing.length) {
            const startOutgoingItemValue = await this.getRepository()
              .createQueryBuilder()
              .select('SUM(amount) * -1 as total')
              .where('address = :id', { id })
              .andWhere("direction = 'Outgoing'")
              .andWhere(prevWhereSqlText)
              .getRawOne();
            startOutgoingValue = startOutgoingItemValue?.total || 0;
          }
        }
      }
    }

    const time = generatePrevTimestamp(Date.now(), period);
    const data = [];
    const startBalance = startValue;
    if (items.length) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].timestamp) {
          startValue += items[i].total;
          data.push({
            time: Number(items[i].timestamp) * 1000,
            value: startValue,
          });
        }
      }
    } else {
      data.push({
        time,
        value: startValue,
      });
    }
    const result = [];
    if (!['max', 'all'].includes(period) && startBalance) {
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
        } else {
          result.push({
            time: item.time,
            value: item.value,
          });
        }
      }
    } else {
      if (data.length) {
        result.push({
          time: dayjs(data[0].time).subtract(1, 'day').valueOf(),
          value: 0,
        });
      }
      result.push(...data);
    }

    const totalIncoming = [];
    const totalOutgoing = [];
    if (['max', 'all'].includes(period)) {
      if (incoming.length) {
        totalIncoming.push({
          time: dayjs(incoming[0].time).subtract(1, 'day').valueOf(),
          value: 0,
        });
      }
      if (outgoing.length) {
        totalOutgoing.push({
          time: dayjs(outgoing[0].time).subtract(1, 'day').valueOf(),
          value: 0,
        });
      }
    }
    if (incoming.length) {
      for (let i = 0; i < incoming.length; i++) {
        if (incoming[i].value && incoming[i].time) {
          startIncomingValue += incoming[i].value;
          totalIncoming.push({
            time: incoming[i].time,
            value: startIncomingValue,
          });
        }
      }
    } else {
      totalIncoming.push({
        time,
        value: startIncomingValue,
      });
    }

    if (outgoing.length) {
      for (let i = 0; i < outgoing.length; i++) {
        if (outgoing[i].time) {
          startOutgoingValue += outgoing[i].value;
          totalOutgoing.push({
            time: outgoing[i].time,
            value: startOutgoingValue,
          });
        }
      }
    } else {
      totalOutgoing.push({
        time,
        value: startOutgoingValue,
      });
    }

    return {
      startValue,
      data: result,
      incoming: totalIncoming,
      outgoing: totalOutgoing,
    };
  }

  async getDirection(
    id: string,
    period: TPeriod,
    direction: TransferDirectionEnum,
  ) {
    const { whereSqlText } = getSqlTextByPeriod({
      period,
      isMicroseconds: false,
    });
    const data = await this.getRepository()
      .createQueryBuilder()
      .select(
        `${direction === 'Outgoing' ? 'SUM(amount) * -1' : 'SUM(amount)'}`,
        'value',
      )
      .addSelect('MIN(timestamp) * 1000', 'time')
      .where('address = :id', { id })
      .andWhere(whereSqlText ? whereSqlText : 'timestamp > 0')
      .andWhere('direction = :direction', { direction })
      .groupBy(averageFilterByMonthlyPeriodQuery)
      .orderBy('timestamp')
      .getRawMany();

    let result = [];
    if (!['max', 'all'].includes(period)) {
      for (let i = marketPeriodMonthData[period] - 1; i >= 0; i--) {
        const date = dayjs().subtract(i, 'month');
        const item = data.find(
          d => dayjs(d.time).format('YYYYMM') === date.format('YYYYMM'),
        );
        if (!item) {
          result.push({
            time: date.valueOf(),
            value: 0,
          });
        } else {
          result.push({
            time: item.time,
            value: item.value,
          });
        }
      }
    } else {
      result = data;
    }
    return result;
  }
}

export default new AddressEventsService();
