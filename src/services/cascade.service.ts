import { getRepository, Repository } from 'typeorm';

import { CascadeEntity } from '../entity/cascade.entity';

class CascadeService {
  private getRepository(): Repository<CascadeEntity> {
    return getRepository(CascadeEntity);
  }

  async getByTxId(txId: string) {
    return this.getRepository()
      .createQueryBuilder()
      .select('timestamp, blockHeight')
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

  async deleteTicketByBlockHeight(blockHeight: number) {
    return await this.getRepository().delete({ blockHeight });
  }

  async deleteAllByTxIds(txIds: string[]) {
    return this.getRepository()
      .createQueryBuilder()
      .delete()
      .where('transactionHash IN (:...txIds)', { txIds })
      .execute();
  }
}

export default new CascadeService();
