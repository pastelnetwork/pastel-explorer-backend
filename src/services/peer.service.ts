import { dataSource } from '../datasource';
import { PeerEntity } from '../entity/peer.entity';

class PeerService {
  private async getRepository() {
    const service = await dataSource;
    return service.getRepository(PeerEntity);
  }
  async getAll(): Promise<PeerEntity[]> {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('city, country, id, ip, latitude, longitude')
      .execute();
  }
}

export default new PeerService();
