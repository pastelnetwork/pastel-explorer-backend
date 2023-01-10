import { getRepository, Repository } from 'typeorm';

import { PeerEntity } from '../entity/peer.entity';

class PeerService {
  private getRepository(): Repository<PeerEntity> {
    return getRepository(PeerEntity);
  }
  async getAll(): Promise<PeerEntity[]> {
    return this.getRepository()
      .createQueryBuilder()
      .select('city, country, id, ip, latitude, longitude')
      .execute();
  }
}

export default new PeerService();
