import { dataSource } from '../datasource';
import { CascadeEntity } from '../entity/cascade.entity';

class CascadeService {
  private async getRepository() {
    const service = await dataSource;
    return service.getRepository(CascadeEntity);
  }

  async getByTxId(txId: string) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('timestamp, blockHeight')
      .where('transactionHash = :txId', { txId })
      .getRawOne();
  }

  async updateCascadeStatus(txId: string, status: string) {
    try {
      const service = await this.getRepository();
      return service
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
    const service = await this.getRepository();
    return await service.delete({ blockHeight });
  }

  async deleteAllByTxIds(txIds: string[]) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .delete()
      .where('transactionHash IN (:...txIds)', { txIds })
      .execute();
  }
}

export default new CascadeService();
