import dayjs from 'dayjs';
import { DeleteResult, In } from 'typeorm';

import { dataSource } from '../datasource';
import { AddressEventEntity } from '../entity/address-event.entity';
import {
  averageFilterByDailyPeriodQuery,
  averageFilterByMonthlyPeriodQuery,
} from '../utils/constants';
import addressInfoServices from './address-info.services';

class AddressEventsService {
  private async getRepository() {
    const service = await dataSource;
    return service.getRepository(AddressEventEntity);
  }
  async getTopBalanceRank(end = 100): Promise<{
    rank: AccountRankItem[];
    totalSum: number;
  }> {
    const service = await this.getRepository();
    const rank = await service
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
    const service = await this.getRepository();
    const rank = await service
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
    const service = await this.getRepository();
    return service
      .createQueryBuilder('wallet')
      .select('address')
      .where('wallet.address like :searchParam', {
        searchParam: `%${searchParam}%`,
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
    const service = await this.getRepository();
    return service.find({
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
    const service = await this.getRepository();
    const { sum } = await service
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
    const service = await this.getRepository();
    return service.find({
      where: {
        transactionHash: transactionHash,
      },
      select: ['amount', 'address', 'direction'],
    });
  }

  async findAllNonZeroAddresses() {
    const service = await this.getRepository();
    return service
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
    const service = await this.getRepository();
    return await service
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
    const service = await this.getRepository();
    return await service
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
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .delete()
      .from(AddressEventEntity)
      .where('transactionHash = :transactionHash', { transactionHash })
      .andWhere('address NOT IN (:...addresses)', { addresses })
      .execute();
  }

  async deleteAllByTxIds(txIds: string[]): Promise<DeleteResult> {
    const service = await this.getRepository();
    return await service.delete({ transactionHash: In(txIds) });
  }

  async getLastUpdated(address: string) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('MAX(timestamp)', 'timestamp')
      .where('address = :address', { address })
      .getRawOne();
  }

  async saveAddressInfoData(address: string, lastUpdated: number) {
    const service = await this.getRepository();
    const duplicateTransaction = await service
      .createQueryBuilder()
      .select('transactionHash')
      .distinct()
      .where('address = :address', { address })
      .groupBy('transactionHash')
      .having('COUNT(DISTINCT direction) > 1')
      .getRawMany();
    const txIDs = Array.from(
      new Set(duplicateTransaction.map(tx => tx.transactionHash)),
    );
    const sentData = await service
      .createQueryBuilder()
      .select('SUM(amount) * -1', 'value')
      .addSelect('MIN(timestamp) * 1000', 'time')
      .where('address = :address', { address })
      .andWhere("direction = 'Outgoing'")
      .andWhere('transactionHash NOT IN (:...txIDs)', { txIDs })
      .groupBy(averageFilterByMonthlyPeriodQuery)
      .orderBy('timestamp')
      .getRawMany();
    const receivedData = await service
      .createQueryBuilder()
      .select('SUM(amount)', 'value')
      .addSelect('MIN(timestamp) * 1000', 'time')
      .where('address = :address', { address })
      .andWhere("direction = 'Incoming'")
      .andWhere('transactionHash NOT IN (:...txIDs)', { txIDs })
      .groupBy(averageFilterByMonthlyPeriodQuery)
      .orderBy('timestamp')
      .getRawMany();
    const balanceHistoryData = await service
      .createQueryBuilder()
      .select('SUM(amount)', 'value')
      .addSelect(
        "CAST(strftime('%s', strftime('%Y-%m-%dT00:00:00+00:00', datetime(timestamp, 'unixepoch'))) AS INT) * 1000",
        'time',
      )
      .where('address = :address', { address })
      .andWhere('transactionHash NOT IN (:...txIDs)', { txIDs })
      .groupBy(averageFilterByDailyPeriodQuery)
      .orderBy('timestamp')
      .getRawMany();
    const incoming = await service
      .createQueryBuilder()
      .select('SUM(amount)', 'value')
      .addSelect(
        "CAST(strftime('%s', strftime('%Y-%m-%dT00:00:00+00:00', datetime(timestamp, 'unixepoch'))) AS INT) * 1000",
        'time',
      )
      .where('address = :address', { address })
      .andWhere("direction = 'Incoming'")
      .andWhere('transactionHash NOT IN (:...txIDs)', { txIDs })
      .groupBy(averageFilterByDailyPeriodQuery)
      .orderBy('timestamp')
      .getRawMany();
    const outgoing = await service
      .createQueryBuilder()
      .select('SUM(amount) * -1', 'value')
      .addSelect(
        "CAST(strftime('%s', strftime('%Y-%m-%dT00:00:00+00:00', datetime(timestamp, 'unixepoch'))) AS INT) * 1000",
        'time',
      )
      .where('address = :address', { address })
      .andWhere("direction = 'Outgoing'")
      .andWhere('transactionHash NOT IN (:...txIDs)', { txIDs })
      .groupBy(averageFilterByDailyPeriodQuery)
      .orderBy('timestamp')
      .getRawMany();

    const newSentData = JSON.parse(JSON.stringify(sentData));
    let newOutgoingData = JSON.parse(JSON.stringify(outgoing));
    if (txIDs.length) {
      const duplicateSentDataData = await service
        .createQueryBuilder()
        .select('amount')
        .addSelect('timestamp * 100', 'time')
        .addSelect('transactionHash')
        .where('address = :address', { address })
        .andWhere('transactionHash IN (:...txIDs)', { txIDs })
        .getRawMany();

      for (let i = 0; i <= newSentData.length - 1; i++) {
        const items = duplicateSentDataData.filter(
          s =>
            dayjs(Number(s.time)).format('YYYYMM') ===
            dayjs(Number(newSentData[i].time)).format('YYYYMM'),
        );
        if (items?.length) {
          const _totalSent = items.reduce(
            (total, item) => total + Number(item.amount),
            0,
          );
          newSentData[i] = {
            ...newSentData[i],
            value: newSentData[i].value + Math.abs(_totalSent),
          };
        }
      }
      for (let i = 0; i <= txIDs.length - 1; i++) {
        const addressData = duplicateSentDataData.filter(
          d => d.transactionHash === txIDs[i],
        );
        if (addressData?.length) {
          const index = newOutgoingData.findIndex(
            s =>
              dayjs(Number(s.time)).format('YYYYMMDD') ===
              dayjs(Number(addressData[0].time)).format('YYYYMMDD'),
          );
          const _totalSent = addressData.reduce(
            (total, item) => total + Number(item.amount),
            0,
          );
          if (index !== -1) {
            newOutgoingData[index] = {
              ...newOutgoingData[index],
              value: newOutgoingData[index].value + Math.abs(_totalSent),
            };
          } else {
            newOutgoingData.push({
              time: addressData[0].time,
              value: Math.abs(_totalSent),
            });
          }
        }
      }

      newOutgoingData = newOutgoingData.sort((a, b) => a.time - b.time);
    }
    const totalSent = newSentData.reduce(
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
    if (newOutgoingData.length) {
      totalOutgoing.push({
        time: dayjs(newOutgoingData[0].time).subtract(1, 'day').valueOf(),
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
    if (newOutgoingData.length) {
      for (let i = 0; i < newOutgoingData.length; i++) {
        if (newOutgoingData[i].time) {
          startOutgoingValue += newOutgoingData[i].value;
          totalOutgoing.push({
            time: newOutgoingData[i].time,
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
      sentByMonthData: JSON.stringify(newSentData),
      lastUpdated,
    });

    return {
      data,
      incoming: totalIncoming,
      outgoing: totalOutgoing,
      receivedByMonthData: receivedData,
      sentByMonthData: newSentData,
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

  async getInfoByAddress(address: string) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('SUM(amount)', 'total')
      .addSelect('direction')
      .where('address = :address', { address })
      .groupBy('direction')
      .getRawMany();
  }

  async getAllAddress() {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('address')
      .groupBy('address')
      .getRawMany();
  }

  async findDataByAddress(address: string) {
    const service = await this.getRepository();
    return service.find({
      where: {
        address,
      },
      select: ['amount', 'timestamp', 'transactionHash', 'direction'],
      order: {
        timestamp: 'DESC',
      },
    });
  }

  async getLatestTransactionByAddress(address: string) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('timestamp')
      .where('address = :address', { address })
      .getRawOne();
  }

  async getTotalPSLByAddress(address: string[]) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('SUM(amount) as total, address')
      .where('address IN (:...address)', { address })
      .groupBy('address')
      .getRawMany();
  }

  async getAddressByTxIds(txIds = []) {
    if (!txIds.length) {
      return [];
    }

    const service = await this.getRepository();
    return service
      .createQueryBuilder('a')
      .select(
        'address, transactionHash, amount, direction, (SELECT SUM(amount) FROM AddressEvent WHERE address = a.address) as total, (SELECT SUM(amount) FROM AddressEvent WHERE address = a.address AND timestamp < a.timestamp) as preTotal',
      )
      .where('transactionHash IN (:...txIds)', { txIds })
      .getRawMany();
  }

  async getTotalAmountByBlockHeightAndAddress(
    blockHeight: number,
    addresses: string[],
  ): Promise<number> {
    const service = await this.getRepository();
    const totalSupply = await service
      .createQueryBuilder()
      .select('SUM(amount)', 'sum')
      .where(
        'transactionHash IN (SELECT id FROM `Transaction` WHERE height = :blockHeight)',
        { blockHeight },
      )
      .andWhere('address IN (:...addresses)', { addresses })
      .getRawOne();
    return totalSupply.sum;
  }

  async getTotalAmountByDateAndAddress(
    dateTime: number,
    addresses: string[],
  ): Promise<number> {
    const service = await this.getRepository();
    const totalSupply = await service
      .createQueryBuilder()
      .select('SUM(amount)', 'sum')
      .where('address IN (:...addresses)', { addresses })
      .andWhere('timestamp <= :dateTime', { dateTime })
      .getRawOne();
    return totalSupply.sum;
  }
}

export default new AddressEventsService();
