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

  async searchByCascadeId(searchParam: string) {
    return this.getRepository()
      .createQueryBuilder()
      .select('cascadeId')
      .where('cascadeId like :searchParam', {
        searchParam: `${searchParam}%`,
      })
      .distinct(true)
      .limit(10)
      .getRawMany();
  }
}

export default new CascadeService();
