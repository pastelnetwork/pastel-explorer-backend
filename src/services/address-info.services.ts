import { getRepository, Repository } from 'typeorm';

import { AddressInfoEntity } from '../entity/address-info.entity';

class AddressInfoService {
  private getRepository(): Repository<AddressInfoEntity> {
    return getRepository(AddressInfoEntity);
  }

  async saveAddressInfo(data: AddressInfoEntity) {
    return this.getRepository().save(data);
  }

  async getBalanceInfoByAddress(address: string) {
    const item = await this.getRepository()
      .createQueryBuilder()
      .select('totalSent, totalReceived, balanceHistoryData')
      .where('address = :address', { address })
      .getRawOne();
    const data = item?.balanceHistoryData
      ? JSON.parse(item.balanceHistoryData)
      : null;
    return {
      totalReceived: item?.totalReceived || 0,
      totalSent: item?.totalSent || 0,
      data: data?.data,
      incoming: data?.incoming,
      outgoing: data?.outgoing,
    };
  }

  async getReceivedDataByAddress(address: string) {
    const item = await this.getRepository()
      .createQueryBuilder()
      .select('receivedByMonthData')
      .where('address = :address', { address })
      .getRawOne();

    return item?.receivedByMonthData
      ? JSON.parse(item.receivedByMonthData)
      : null;
  }

  async getSentDataByAddress(address: string) {
    const item = await this.getRepository()
      .createQueryBuilder()
      .select('sentByMonthData')
      .where('address = :address', { address })
      .getRawOne();

    return item?.sentByMonthData ? JSON.parse(item.sentByMonthData) : null;
  }

  async getLastUpdated(address: string) {
    return this.getRepository()
      .createQueryBuilder()
      .select('MAX(lastUpdated)', 'lastUpdated')
      .where('address = :address', { address })
      .getRawOne();
  }
}

export default new AddressInfoService();
