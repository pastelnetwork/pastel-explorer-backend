import { getRepository, Repository } from 'typeorm';

import { MasternodeEntity } from '../entity/masternode.entity';

class PeerService {
  private getRepository(): Repository<MasternodeEntity> {
    return getRepository(MasternodeEntity);
  }
  async getAll(): Promise<MasternodeEntity[]> {
    return this.getRepository().find({});
  }
}

export default new PeerService();
