import { dataSource } from '../datasource';
import { MasternodeEntity } from '../entity/masternode.entity';

class PeerService {
  private async getRepository() {
    const service = await dataSource;
    return service.getRepository(MasternodeEntity);
  }
  async getAll(): Promise<MasternodeEntity[]> {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select(
        'address, city, country, id, ip, lastPaidTime, latitude, longitude, port, status',
      )
      .execute();
  }

  async countFindAll() {
    const service = await this.getRepository();
    const result = await service
      .createQueryBuilder()
      .select('COUNT(1) as total')
      .getRawOne();
    return result.total;
  }

  async countFindByData(date: number) {
    const service = await this.getRepository();
    const result = await service
      .createQueryBuilder()
      .select('COUNT(1) as total')
      .where('masternodecreated <= :date', { date })
      .andWhere('masternodecreated IS NOT NULL')
      .getRawOne();
    return result.total;
  }

  async getAllMasternodeCreated(): Promise<MasternodeEntity[]> {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('masternodecreated')
      .getRawMany();
  }

  async getAllForMasternodePage(): Promise<MasternodeEntity[]> {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select(
        'address, city, country, ip, lastPaidTime, port, status, lastPaidBlock, protocolVersion, dateTimeLastSeen, activeSeconds, snPastelIdPubkey, masternodeRank, rankAsOfBlockHeight',
      )
      .execute();
  }
}

export default new PeerService();
