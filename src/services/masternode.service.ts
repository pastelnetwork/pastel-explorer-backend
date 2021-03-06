import { getRepository, Repository } from 'typeorm';

import { MasternodeEntity } from '../entity/masternode.entity';

class PeerService {
  private getRepository(): Repository<MasternodeEntity> {
    return getRepository(MasternodeEntity);
  }
  async getAll(): Promise<MasternodeEntity[]> {
    return this.getRepository().find({});
  }

  async countFindAll() {
    const result = await this.getRepository()
      .createQueryBuilder()
      .select('COUNT(1) as total')
      .getRawOne();
    return result.total;
  }
}

export default new PeerService();
