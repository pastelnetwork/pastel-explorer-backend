import { dataSource } from '../datasource';
import { AddressInfoEntity } from '../entity/address-info.entity';

class AddressInfoService {
  private async getRepository() {
    const service = await dataSource;
    return service.getRepository(AddressInfoEntity);
  }

  async saveAddressInfo(data: AddressInfoEntity) {
    const service = await this.getRepository();
    return service.save(data);
  }

  async getBalanceInfoByAddress(address: string) {
    const service = await this.getRepository();
    const item = await service
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
    const service = await this.getRepository();
    const item = await service
      .createQueryBuilder()
      .select('receivedByMonthData')
      .where('address = :address', { address })
      .getRawOne();

    return item?.receivedByMonthData
      ? JSON.parse(item.receivedByMonthData)
      : null;
  }

  async getSentDataByAddress(address: string) {
    const service = await this.getRepository();
    const item = await service
      .createQueryBuilder()
      .select('sentByMonthData')
      .where('address = :address', { address })
      .getRawOne();

    return item?.sentByMonthData ? JSON.parse(item.sentByMonthData) : null;
  }

  async getLastUpdated(address: string) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('MAX(lastUpdated)', 'lastUpdated')
      .where('address = :address', { address })
      .getRawOne();
  }
}

export default new AddressInfoService();
