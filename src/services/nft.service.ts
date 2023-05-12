import { getRepository, Repository } from 'typeorm';

import { NftEntity } from '../entity/nft.entity';

class NftService {
  private getRepository(): Repository<NftEntity> {
    return getRepository(NftEntity);
  }

  async removeNftByBlockHeight(height: number) {
    return this.getRepository()
      .createQueryBuilder()
      .delete()
      .where('blockHeight = :height', { height })
      .execute();
  }

  async getNftIdByTxId(txId: string) {
    return this.getRepository()
      .createQueryBuilder()
      .select('id')
      .where('transactionHash = :txId', { txId })
      .getRawOne();
  }

  async updateNftStatus(
    txId: string,
    status: string,
    activationTicket: string,
  ) {
    return this.getRepository()
      .createQueryBuilder()
      .update({
        status,
        activation_ticket: activationTicket,
      })
      .where('transactionHash = :txId', { txId })
      .execute();
  }
}

export default new NftService();
