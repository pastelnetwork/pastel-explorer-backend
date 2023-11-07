import { getRepository, Repository } from 'typeorm';

import { AddressEntity } from '../entity/address.entity';

class AddressService {
  private getRepository(): Repository<AddressEntity> {
    return getRepository(AddressEntity);
  }

  async getAddressByAddresses(addresses: string[]) {
    return this.getRepository()
      .createQueryBuilder()
      .select('address, type')
      .where('address IN (:...addresses)', { addresses })
      .groupBy('address')
      .getRawMany();
  }

  async getByAddress(address: string) {
    return this.getRepository()
      .createQueryBuilder()
      .select('address, type')
      .where('address = :address', { address })
      .getRawOne();
  }

  async deleteAll() {
    return this.getRepository().query('DELETE FROM AddressEntity');
  }
}

export default new AddressService();
