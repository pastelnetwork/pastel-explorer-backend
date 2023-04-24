import dayjs from 'dayjs';
import { DeleteResult, getRepository, Repository } from 'typeorm';

import { AddressEventEntity } from '../entity/address-event.entity';
import {
  averageFilterByDailyPeriodQuery,
  averageFilterByMonthlyPeriodQuery,
} from '../utils/constants';
import addressInfoServices from './address-info.services';

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

  async getLastUpdated(address: string) {
    return this.getRepository()
      .createQueryBuilder()
      .select('MAX(timestamp)', 'timestamp')
      .where('address = :address', { address })
      .getRawOne();
  }

  async saveAddressInfoData(address: string, lastUpdated: number) {
    const sentData = await this.getRepository()
      .createQueryBuilder()
      .select('SUM(amount) * -1', 'value')
      .addSelect('MIN(timestamp) * 1000', 'time')
      .where('address = :address', { address })
      .andWhere("direction = 'Outgoing'")
      .groupBy(averageFilterByMonthlyPeriodQuery)
      .orderBy('timestamp')
      .getRawMany();
    const receivedData = await this.getRepository()
      .createQueryBuilder()
      .select('SUM(amount)', 'value')
      .addSelect('MIN(timestamp) * 1000', 'time')
      .where('address = :address', { address })
      .andWhere("direction = 'Incoming'")
      .groupBy(averageFilterByMonthlyPeriodQuery)
      .orderBy('timestamp')
      .getRawMany();
    const balanceHistoryData = await this.getRepository()
      .createQueryBuilder()
      .select('SUM(amount)', 'value')
      .addSelect(
        "CAST(strftime('%s', strftime('%Y-%m-%dT00:00:00+00:00', datetime(timestamp, 'unixepoch'))) AS INT) * 1000",
        'time',
      )
      .where('address = :address', { address })
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
      .where('address = :address', { address })
      .andWhere("direction = 'Incoming'")
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
      .where('address = :address', { address })
      .andWhere("direction = 'Outgoing'")
      .groupBy(averageFilterByDailyPeriodQuery)
      .orderBy('timestamp')
      .getRawMany();
    const totalSent = sentData.reduce(
      (total, current) => total + current.value,
      0,
    );
    const totalReceived = receivedData.reduce(
      (total, current) => total + current.value,
      0,
    );
    const data = [];
    let startValue = 0;
    if (balanceHistoryData.length) {
      for (let i = 0; i < balanceHistoryData.length; i++) {
        if (balanceHistoryData[i].time) {
          startValue += balanceHistoryData[i].value;
          data.push({
            time: Number(balanceHistoryData[i].time),
            value: startValue,
          });
        }
      }
    } else {
      data.push({
        time: dayjs().valueOf(),
        value: startValue,
      });
    }

    const totalIncoming = [];
    const totalOutgoing = [];
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
    let startIncomingValue = 0;
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
        time: dayjs().valueOf(),
        value: startIncomingValue,
      });
    }

    let startOutgoingValue = 0;
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
        time: dayjs().valueOf(),
        value: startOutgoingValue,
      });
    }

    await addressInfoServices.saveAddressInfo({
      address,
      totalSent,
      totalReceived,
      balanceHistoryData: JSON.stringify({
        data,
        incoming: totalOutgoing,
        outgoing: totalIncoming,
      }),
      receivedByMonthData: JSON.stringify(receivedData),
      sentByMonthData: JSON.stringify(sentData),
      lastUpdated,
    });

    return {
      data,
      incoming: totalIncoming,
      outgoing: totalOutgoing,
      receivedByMonthData: receivedData,
      sentByMonthData: sentData,
      totalSent,
      totalReceived,
    };
  }

  async getBalanceHistory(id: string) {
    const lastAddressInfoUpdated = await addressInfoServices.getLastUpdated(id);
    const lastAddressEventUpdated = await this.getLastUpdated(id);
    let balanceInfoData = await addressInfoServices.getBalanceInfoByAddress(id);
    if (
      !lastAddressInfoUpdated ||
      lastAddressInfoUpdated.lastUpdated !== lastAddressEventUpdated.timestamp
    ) {
      balanceInfoData = await this.saveAddressInfoData(
        id,
        lastAddressEventUpdated.timestamp,
      );
    }

    return {
      data: balanceInfoData.data,
      incoming: balanceInfoData.incoming,
      outgoing: balanceInfoData.outgoing,
      totalReceived: balanceInfoData?.totalReceived || 0,
      totalSent: balanceInfoData?.totalSent || 0,
    };
  }

  async getDirection(id: string, direction: TransferDirectionEnum) {
    const lastAddressInfoUpdated = await addressInfoServices.getLastUpdated(id);
    const lastAddressEventUpdated = await this.getLastUpdated(id);
    if (
      !lastAddressInfoUpdated ||
      lastAddressInfoUpdated.lastUpdated !== lastAddressEventUpdated.timestamp
    ) {
      const data = await this.saveAddressInfoData(
        id,
        lastAddressEventUpdated.timestamp,
      );
      if (direction === 'Incoming') {
        return data.receivedByMonthData;
      }

      return data.sentByMonthData;
    }

    if (direction === 'Incoming') {
      return addressInfoServices.getReceivedDataByAddress(id);
    }

    return addressInfoServices.getSentDataByAddress(id);
  }
}

export default new AddressEventsService();
