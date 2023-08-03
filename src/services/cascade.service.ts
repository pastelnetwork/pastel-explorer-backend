import { getRepository, Repository } from 'typeorm';

import { NftEntity } from '../entity/nft.entity';

class CascadeService {
  private getRepository(): Repository<NftEntity> {
    return getRepository(NftEntity);
  }

  async getByTxId(txId: string) {
    return this.getRepository()
      .createQueryBuilder()
      .select('id')
      .where('transactionHash = :txId', { txId })
      .getRawOne();
  }

  async updateCascadeStatus(txId: string, status: string) {
    try {
      return this.getRepository()
        .createQueryBuilder()
        .update({
          status,
        })
        .where('transactionHash = :txId', { txId })
        .execute();
    } catch (error) {
      console.log('updateCascadeStatus error: ', error);
      return false;
    }
  }
}

export default new CascadeService();
