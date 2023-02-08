import { getRepository, Repository } from 'typeorm';

import { SenseRequestsEntity } from '../entity/senserequests.entity';

class SenseRequestsService {
  private getRepository(): Repository<SenseRequestsEntity> {
    return getRepository(SenseRequestsEntity);
  }

  async getSenseRequestByImageHash(
    imageHash: string,
    txid: string,
  ): Promise<SenseRequestsEntity> {
    try {
      if (txid === 'tx') {
        return await this.getRepository()
          .createQueryBuilder()
          .select(
            'imageFileHash, rawData, transactionHash, rarenessScoresTable, blockHash, blockHeight, utcTimestampWhenRequestSubmitted, pastelIdOfSubmitter, pastelIdOfRegisteringSupernode1, pastelIdOfRegisteringSupernode2, pastelIdOfRegisteringSupernode3, isPastelOpenapiRequest, openApiSubsetIdString, isLikelyDupe, dupeDetectionSystemVersion, openNsfwScore, rarenessScore, alternativeNsfwScores, internetRareness, imageFingerprintOfCandidateImageFile, pctOfTop10MostSimilarWithDupeProbAbove25pct, pctOfTop10MostSimilarWithDupeProbAbove33pct, pctOfTop10MostSimilarWithDupeProbAbove50pct',
          )
          .where('imageFileHash = :imageHash', { imageHash })
          .orderBy('CAST(currentBlockHeight AS INT)', 'DESC')
          .getRawOne();
      }
      const item = await this.getRepository()
        .createQueryBuilder()
        .select(
          'imageFileHash, rawData, transactionHash, rarenessScoresTable, blockHash, blockHeight, utcTimestampWhenRequestSubmitted, pastelIdOfSubmitter, pastelIdOfRegisteringSupernode1, pastelIdOfRegisteringSupernode2, pastelIdOfRegisteringSupernode3, isPastelOpenapiRequest, openApiSubsetIdString, isLikelyDupe, dupeDetectionSystemVersion, openNsfwScore, rarenessScore, alternativeNsfwScores, internetRareness, imageFingerprintOfCandidateImageFile, pctOfTop10MostSimilarWithDupeProbAbove25pct, pctOfTop10MostSimilarWithDupeProbAbove33pct, pctOfTop10MostSimilarWithDupeProbAbove50pct',
        )
        .where('imageFileHash = :imageHash', { imageHash })
        .andWhere('transactionHash = :txid', { txid })
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
      .select('imageFileHash, dupeDetectionSystemVersion, transactionHash')
      .where('transactionHash = :txid', { txid })
      .getRawMany();
  }

  async getSenseListByBlockHash(blockHash: string) {
    return await this.getRepository()
      .createQueryBuilder()
      .select(
        'imageFileHash, dupeDetectionSystemVersion, transactionHash, rawData',
      )
      .where(
        'transactionHash IN (SELECT id FROM `Transaction` WHERE blockHash = :blockHash)',
        { blockHash },
      )
      .getRawMany();
  }

  async getSenseByTxIdAndImageHash(txid: string, imageHash: string) {
    return await this.getRepository()
      .createQueryBuilder()
      .select('*')
      .where('transactionHash = :txid', { txid })
      .andWhere('imageFileHash = :imageHash', { imageHash })
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
      .select(
        'imageFileHash, dupeDetectionSystemVersion, rawData, transactionHash',
      )
      .where('transactionHash = :txid', { txid })
      .getRawMany();
  }

  async deleteTicketByBlockHeight(blockHeight: number) {
    return await this.getRepository().delete({ blockHeight });
  }

  async deleteTicketByBlockHash(blockHash: string) {
    return await this.getRepository().delete({ blockHash });
  }

  async getAllByPastelId(pastelIdOfSubmitter: string) {
    return this.getRepository()
      .createQueryBuilder()
      .select('imageFileHash, dupeDetectionSystemVersion, transactionHash')
      .where('pastelIdOfSubmitter = :pastelIdOfSubmitter', {
        pastelIdOfSubmitter,
      })
      .getRawMany();
  }

  async getImageHashByTxIds(txIds: string[]) {
    return this.getRepository()
      .createQueryBuilder()
      .select('imageFileHash, dupeDetectionSystemVersion, transactionHash')
      .where('transactionHash IN (:...txIds)', {
        txIds,
      })
      .getRawMany();
  }
}

export default new SenseRequestsService();
