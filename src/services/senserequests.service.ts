import { getRepository, Repository } from 'typeorm';

import { SenseRequestsEntity } from '../entity/senserequests.entity';

class SenseRequestsService {
  private getRepository(): Repository<SenseRequestsEntity> {
    return getRepository(SenseRequestsEntity);
  }

  async getSenseRequestByImageHash(
    imageHash: string,
  ): Promise<SenseRequestsEntity> {
    try {
      const item = await this.getRepository()
        .createQueryBuilder()
        .select('*')
        .where('imageFileHash = :imageHash', { imageHash })
        .getRawOne();

      return item;
    } catch {
      return null;
    }
  }
}

export default new SenseRequestsService();
