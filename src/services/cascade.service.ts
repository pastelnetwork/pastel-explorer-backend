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
}

export default new CascadeService();
