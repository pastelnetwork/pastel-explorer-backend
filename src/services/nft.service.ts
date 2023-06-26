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
        'transactionHash, transactionTime, total_copies, royalty, green, author, collection_txid, collection_name, collection_alias, creator_name, creator_website, creator_written_statement, nft_title, nft_type, nft_series_name, nft_creation_video_youtube_url, nft_keyword_set, data_hash, original_file_size_in_bytes, file_type, make_publicly_accessible, dd_and_fingerprints_ic, dd_and_fingerprints_max, dd_and_fingerprints_ids, rq_ic, rq_max, rq_oti, preview_thumbnail AS image, status, pastel_block_hash_when_request_submitted, pastel_block_height_when_request_submitted, utc_timestamp_when_request_submitted, pastel_id_of_submitter, pastel_id_of_registering_supernode_1, pastel_id_of_registering_supernode_2, pastel_id_of_registering_supernode_3, is_pastel_openapi_request, dupe_detection_system_version, is_likely_dupe, overall_rareness_score, is_rare_on_internet, pct_of_top_10_most_similar_with_dupe_prob_above_25pct, pct_of_top_10_most_similar_with_dupe_prob_above_33pct, pct_of_top_10_most_similar_with_dupe_prob_above_50pct, rareness_scores_table_json_compressed_b64, open_nsfw_score, image_fingerprint_of_candidate_image_file, nsfw_score, internet_rareness, alternative_nsfw_scores, blockHeight, rawData',
      )
      .where('transactionHash = :txId', { txId })
      .getRawOne();
    let username = undefined;
    let timestamp = undefined;
    let currentOwner = undefined;

    if (item?.author) {
      username = await ticketService.getUsernameTicketByPastelId(item.author);
      timestamp = await ticketService.getTransactionTimeByPastelId(item.author);
      currentOwner = await ticketService.getLatestTransferTicketsByTxId(txId);
    }
    return {
      ...item,
      username,
      currentOwnerPastelID: currentOwner?.pastelID,
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
