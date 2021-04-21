import { getRepository, Repository } from 'typeorm';

import { PeerEntity } from '../entity/peer.entity';

class PeerService {
  private getRepository(): Repository<PeerEntity> {
    return getRepository(PeerEntity);
  }
  async getAll(): Promise<PeerEntity[]> {
    return this.getRepository().find({});
  }
}

export default new PeerService();
