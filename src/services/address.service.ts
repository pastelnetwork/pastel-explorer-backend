import { dataSource } from '../datasource';
import { AddressEntity } from '../entity/address.entity';

class AddressService {
  private async getRepository() {
    const service = await dataSource;
    return service.getRepository(AddressEntity);
  }

  async getAddressByAddresses(addresses: string[]) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('address, type')
      .where('address IN (:...addresses)', { addresses })
      .groupBy('address')
      .getRawMany();
  }

  async getByAddress(address: string) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('address, type')
      .where('address = :address', { address })
      .getRawOne();
  }

  async deleteAll() {
    const service = await this.getRepository();
    return service.query('DELETE FROM AddressEntity');
  }
}

export default new AddressService();
