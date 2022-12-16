import { getRepository, Repository } from 'typeorm';

import { CascadeEntity } from '../entity/cascade.entity';

class CascadeService {
  private getRepository(): Repository<CascadeEntity> {
    return getRepository(CascadeEntity);
  }

  async getCascadeById(id: string) {
    return await this.getRepository()
      .createQueryBuilder()
      .select('*')
      .where('cascadeId = :id', { id })
      .getRawOne();
  }

  async getCascadeByTxId(txid: string) {
    return await this.getRepository()
      .createQueryBuilder()
      .select('*')
      .where('transactionHash = :txid', { txid })
      .getRawOne();
  }

  async getCascadeListByTxId(txid: string) {
    return await this.getRepository()
      .createQueryBuilder()
      .select('*')
      .where('transactionHash = :txid', { txid })
      .getRawMany();
  }

  async getCascadeListByBlockHash(blockHash: string) {
    return await this.getRepository()
      .createQueryBuilder()
      .select('*')
      .where(
        'transactionHash IN (SELECT id FROM `Transaction` WHERE blockHash = :blockHash)',
        { blockHash },
      )
      .getRawMany();
  }
}

export default new CascadeService();
