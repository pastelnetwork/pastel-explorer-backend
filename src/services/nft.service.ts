import { getRepository, Repository } from 'typeorm';

import { NftEntity } from '../entity/nft.entity';
import ticketService from './ticket.service';

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
    try {
      return this.getRepository()
        .createQueryBuilder()
        .update({
          status,
          activation_ticket: activationTicket,
        })
        .where('transactionHash = :txId', { txId })
        .execute();
    } catch (error) {
      console.log('updateNftStatus error: ', error);
      return false;
    }
  }

  async getNftDetailsByTxId(txId: string) {
    const item = await this.getRepository()
      .createQueryBuilder()
      .select(
        'transactionHash, transactionTime, total_copies, royalty, green, author, collection_txid, collection_name, collection_alias, creator_name, creator_website, creator_written_statement, nft_title, nft_type, nft_series_name, nft_creation_video_youtube_url, nft_keyword_set, data_hash, original_file_size_in_bytes, file_type, make_publicly_accessible, dd_and_fingerprints_ic, dd_and_fingerprints_max, dd_and_fingerprints_ids, rq_ic, rq_max, rq_oti, preview_thumbnail AS image, status',
      )
      .where('transactionHash = :txId', { txId })
      .getRawOne();
    let username = undefined;
    let timestamp = undefined;

    if (item?.author) {
      username = await ticketService.getUsernameTicketByPastelId(item.author);
      timestamp = await ticketService.getTransactionTimeByPastelId(item.author);
    }
    return {
      ...item,
      username,
      memberSince: timestamp,
    };
  }

  async deleteByBlockHeight(blockHeight: number) {
    return await this.getRepository().delete({ blockHeight });
  }

  async getNftForCollectionByTxIds(txIds: string[]) {
    return await this.getRepository()
      .createQueryBuilder()
      .select('preview_thumbnail, nft_title, transactionHash, transactionTime')
      .where('transactionHash IN (:...txIds)', { txIds })
      .getRawMany();
  }

  async getNftThumbnailByTxIds(txIds: string[]) {
    return await this.getRepository()
      .createQueryBuilder()
      .select('preview_thumbnail, transactionHash')
      .where('transactionHash IN (:...txIds)', { txIds })
      .getRawMany();
  }
}

export default new NftService();
