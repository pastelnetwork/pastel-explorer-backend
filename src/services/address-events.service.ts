import { DeleteResult, getRepository, Repository } from 'typeorm';

import { AddressEventEntity } from '../entity/address-event.entity';

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
      select: ['amount', 'timestamp', 'transactionHash'],
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
      select: ['amount', 'transactionHash', 'address', 'direction'],
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
}

export default new AddressEventsService();
