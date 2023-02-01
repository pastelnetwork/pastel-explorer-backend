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
        .select(
          'imageFileHash, rawData, transactionHash, rarenessScoresTable, blockHash, blockHeight, utcTimestampWhenRequestSubmitted, pastelIdOfSubmitter, pastelIdOfRegisteringSupernode1, pastelIdOfRegisteringSupernode2, pastelIdOfRegisteringSupernode3, isPastelOpenapiRequest, openApiSubsetIdString, isLikelyDupe, dupeDetectionSystemVersion, openNsfwScore, rarenessScore, alternativeNsfwScores, internetRareness, imageFingerprintOfCandidateImageFile, pctOfTop10MostSimilarWithDupeProbAbove25pct, pctOfTop10MostSimilarWithDupeProbAbove33pct, pctOfTop10MostSimilarWithDupeProbAbove50pct',
        )
        .where('imageFileHash = :imageHash', { imageHash })
        .getRawOne();

      return item;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async getSenseListByTxId(txid: string) {
    return await this.getRepository()
      .createQueryBuilder()
      .select('*')
      .where('transactionHash = :txid', { txid })
      .getRawMany();
  }

  async getSenseListByBlockHash(blockHash: string) {
    return await this.getRepository()
      .createQueryBuilder()
      .select('imageFileHash, dupeDetectionSystemVersion, rawData')
      .where(
        'transactionHash IN (SELECT id FROM `Transaction` WHERE blockHash = :blockHash)',
        { blockHash },
      )
      .getRawMany();
  }

  async getSenseByTxId(txid: string) {
    return await this.getRepository()
      .createQueryBuilder()
      .select('*')
      .where('transactionHash = :txid', { txid })
      .getRawOne();
  }

  async searchByImageHash(searchParam: string) {
    return this.getRepository()
      .createQueryBuilder()
      .select('imageFileHash')
      .where('imageFileHash like :searchParam', {
        searchParam: `${searchParam}%`,
      })
      .distinct(true)
      .limit(10)
      .getRawMany();
  }

  async getSenseListForTransactionDetails(txid: string) {
    return await this.getRepository()
      .createQueryBuilder()
      .select('imageFileHash, dupeDetectionSystemVersion, rawData')
      .where('transactionHash = :txid', { txid })
      .getRawMany();
  }

  async deleteTicketByBlockHeight(blockHeight: number) {
    return await this.getRepository().delete({ blockHeight });
  }

  async deleteTicketByBlockHash(blockHash: string) {
    return await this.getRepository().delete({ blockHash });
  }
}

export default new SenseRequestsService();
