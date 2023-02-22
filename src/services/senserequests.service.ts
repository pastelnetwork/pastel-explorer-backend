import dayjs, { ManipulateType } from 'dayjs';
import { getRepository, Repository } from 'typeorm';

import { SenseRequestsEntity } from '../entity/senserequests.entity';
import { getSqlTextForCascadeAndSenseStatisticsByPeriod } from '../utils/helpers';
import { TPeriod } from '../utils/period';

class SenseRequestsService {
  private getRepository(): Repository<SenseRequestsEntity> {
    return getRepository(SenseRequestsEntity);
  }

  async getSenseRequestByImageHash(
    imageHash: string,
    txid: string,
  ): Promise<SenseRequestsEntity> {
    try {
      if (!txid) {
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

  async getAverageRarenessScoreForChart(period: TPeriod) {
    const { groupBy, whereSqlText } =
      getSqlTextForCascadeAndSenseStatisticsByPeriod(period);
    let items = await this.getRepository()
      .createQueryBuilder()
      .select(
        'AVG(rarenessScore) as average, MAX(rarenessScore) as highest, transactionTime as timestamp',
      )
      .where(whereSqlText)
      .andWhere('rarenessScore > 0')
      .groupBy(groupBy)
      .orderBy('transactionTime', 'ASC')
      .getRawMany();
    let lastTime = dayjs().valueOf();
    if (!items.length) {
      const lastSense = await this.getRepository()
        .createQueryBuilder()
        .select('transactionTime')
        .orderBy('transactionTime', 'DESC')
        .limit(1)
        .getRawOne();
      lastTime = lastSense?.transactionTime || dayjs().valueOf();
      const { groupBy, whereSqlText } =
        getSqlTextForCascadeAndSenseStatisticsByPeriod(
          period,
          lastSense?.transactionTime,
        );
      items = await this.getRepository()
        .createQueryBuilder()
        .select(
          'AVG(rarenessScore) as average, MAX(rarenessScore) as highest, transactionTime as timestamp',
        )
        .where(whereSqlText)
        .andWhere('rarenessScore > 0')
        .groupBy(groupBy)
        .orderBy('transactionTime', 'ASC')
        .getRawMany();
    }
    let newItems = items;
    if (period === '24h' && items.length < 23) {
      newItems = [];
      for (let i = 24; i > 0; i--) {
        const target = dayjs(lastTime).subtract(i, 'hour');
        const sense = items.find(
          s =>
            dayjs(s.timestamp).format('YYYYMMDDHH') ===
            target.format('YYYYMMDDHH'),
        );
        if (!sense) {
          newItems.push({
            timestamp: target.valueOf(),
            average: 0,
            highest: 0,
          });
        } else {
          newItems.push(sense);
        }
      }
    }

    return newItems;
  }

  async countTotalRarenessScore(period: TPeriod) {
    const { whereSqlText, duration } =
      getSqlTextForCascadeAndSenseStatisticsByPeriod(period);
    let item = await this.getRepository()
      .createQueryBuilder()
      .select('AVG(rarenessScore) as total')
      .where(whereSqlText)
      .andWhere('rarenessScore > 0')
      .getRawOne();

    if (!item?.total) {
      const lastSense = await this.getRepository()
        .createQueryBuilder()
        .select('transactionTime')
        .orderBy('transactionTime', 'DESC')
        .limit(1)
        .getRawOne();
      let unit: ManipulateType = 'day';
      if (period === '24h') {
        unit = 'hour';
      }
      const startDate = dayjs(lastSense?.transactionTime)
        .subtract(duration, unit)
        .valueOf();
      item = await this.getRepository()
        .createQueryBuilder()
        .select('AVG(rarenessScore) as total')
        .where('transactionTime >= :startDate', { startDate })
        .andWhere('rarenessScore > 0')
        .getRawOne();
    }
    return item?.total || 0;
  }

  async getDifferenceRarenessScore(period: TPeriod) {
    if (period === 'max' || period === 'all') {
      const currentSense = await this.getRepository()
        .createQueryBuilder()
        .select('AVG(rarenessScore) as total')
        .getRawOne();

      const difference = (currentSense.total / (currentSense.total / 2)) * 100;
      if (Number.isNaN(difference)) {
        return '0.00';
      }
      return difference.toFixed(2);
    }
    const { duration } = getSqlTextForCascadeAndSenseStatisticsByPeriod(period);
    let unit: ManipulateType = 'day';
    if (period === '24h') {
      unit = 'hour';
    }
    const startDate = dayjs()
      .subtract(duration * 2, unit)
      .valueOf();
    const endDate = dayjs().subtract(duration, unit).valueOf();
    let lastDaySense = await this.getRepository()
      .createQueryBuilder()
      .select('AVG(rarenessScore) as total')
      .where('transactionTime >= :startDate', { startDate })
      .andWhere('transactionTime < :endDate', { endDate })
      .getRawOne();

    const currentDate = dayjs().valueOf();
    let currentSense = await this.getRepository()
      .createQueryBuilder()
      .select('AVG(rarenessScore) as total')
      .where('transactionTime >= :startDate', { startDate: endDate })
      .andWhere('transactionTime <= :endDate', { endDate: currentDate })
      .getRawOne();

    if (!currentSense?.total) {
      const lastSense = await this.getRepository()
        .createQueryBuilder()
        .select('transactionTime')
        .orderBy('transactionTime', 'DESC')
        .limit(1)
        .getRawOne();
      const startDate = dayjs(lastSense?.transactionTime)
        .subtract(duration, unit)
        .valueOf();
      currentSense = await this.getRepository()
        .createQueryBuilder()
        .select('AVG(rarenessScore) as total')
        .where('transactionTime >= :startDate', { startDate })
        .andWhere('transactionTime <= :endDate', { endDate: currentDate })
        .getRawOne();

      const newStartDate = dayjs(lastSense?.transactionTime)
        .subtract(duration * 2, unit)
        .valueOf();
      lastDaySense = await this.getRepository()
        .createQueryBuilder()
        .select('AVG(rarenessScore) as total')
        .where('transactionTime >= :startDate', { startDate: newStartDate })
        .andWhere('transactionTime < :endDate', { endDate: startDate })
        .getRawOne();
    }
    const difference =
      ((currentSense.total - lastDaySense.total) /
        ((currentSense.total + lastDaySense.total) / 2)) *
      100;

    if (Number.isNaN(difference)) {
      return '0.00';
    }

    return difference.toFixed(2);
  }
}

export default new SenseRequestsService();
