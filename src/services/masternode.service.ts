import { getRepository, Repository } from 'typeorm';

import { MasternodeEntity } from '../entity/masternode.entity';

class PeerService {
  private getRepository(): Repository<MasternodeEntity> {
    return getRepository(MasternodeEntity);
  }
  async getAll(): Promise<MasternodeEntity[]> {
    return this.getRepository()
      .createQueryBuilder()
      .select(
        'address, city, country, id, ip, lastPaidTime, latitude, longitude, port, status',
      )
      .execute();
  }

  async countFindAll() {
    const result = await this.getRepository()
      .createQueryBuilder()
      .select('COUNT(1) as total')
      .getRawOne();
    return result.total;
  }

  async countFindByData(date: number) {
    const result = await this.getRepository()
      .createQueryBuilder()
      .select('COUNT(1) as total')
      .where('masternodecreated <= :date', { date })
      .andWhere('masternodecreated IS NOT NULL')
      .getRawOne();
    return result.total;
  }

  async getAllMasternodeCreated(): Promise<MasternodeEntity[]> {
    return this.getRepository()
      .createQueryBuilder()
      .select('masternodecreated')
      .getRawMany();
  }

  async getAllForMasternodePage(): Promise<MasternodeEntity[]> {
    return this.getRepository()
      .createQueryBuilder()
      .select(
        'address, country, ip, lastPaidTime, port, status, lastPaidBlock, protocolVersion, dateTimeLastSeen, activeSeconds, snPastelIdPubkey, masternodeRank, rankAsOfBlockHeight',
      )
      .execute();
  }
}

export default new PeerService();
