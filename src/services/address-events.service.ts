import { getRepository, Repository } from 'typeorm';

import { AddressEventEntity } from '../entity/address-event.entity';

class AddressEventsService {
  private getRepository(): Repository<AddressEventEntity> {
    return getRepository(AddressEventEntity);
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
  }: {
    address: string;
    limit: number;
    offset: number;
  }) {
    return this.getRepository().find({
      where: {
        address,
      },
      select: ['amount', 'timestamp', 'transactionHash'],
      take: limit,
      skip: offset,
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
      select: ['amount', 'transactionHash', 'address', 'direction'],
    });
  }
}

export default new AddressEventsService();
