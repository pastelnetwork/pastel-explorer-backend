import dayjs, { ManipulateType } from 'dayjs';
import { getRepository, Repository } from 'typeorm';

import { SenseRequestsEntity } from '../entity/senserequests.entity';
import { TransactionEntity } from '../entity/transaction.entity';
import { calculateDifference, getSqlByCondition } from '../utils/helpers';
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
            'imageFileHash, imageFileCdnUrl, rawData, transactionHash, rarenessScoresTable, blockHash, blockHeight, utcTimestampWhenRequestSubmitted, pastelIdOfSubmitter, pastelIdOfRegisteringSupernode1, pastelIdOfRegisteringSupernode2, pastelIdOfRegisteringSupernode3, isPastelOpenapiRequest, isLikelyDupe, dupeDetectionSystemVersion, openNsfwScore, rarenessScore, alternativeNsfwScores, internetRareness, imageFingerprintOfCandidateImageFile, pctOfTop10MostSimilarWithDupeProbAbove25pct, pctOfTop10MostSimilarWithDupeProbAbove33pct, pctOfTop10MostSimilarWithDupeProbAbove50pct',
          )
          .where('imageFileHash = :imageHash', { imageHash })
          .orderBy('CAST(currentBlockHeight AS INT)', 'DESC')
          .getRawOne();
      }
      if (imageHash && txid) {
        return await this.getRepository()
          .createQueryBuilder()
          .select(
            'imageFileHash, imageFileCdnUrl, rawData, transactionHash, rarenessScoresTable, blockHash, blockHeight, utcTimestampWhenRequestSubmitted, pastelIdOfSubmitter, pastelIdOfRegisteringSupernode1, pastelIdOfRegisteringSupernode2, pastelIdOfRegisteringSupernode3, isPastelOpenapiRequest, isLikelyDupe, dupeDetectionSystemVersion, openNsfwScore, rarenessScore, alternativeNsfwScores, internetRareness, imageFingerprintOfCandidateImageFile, pctOfTop10MostSimilarWithDupeProbAbove25pct, pctOfTop10MostSimilarWithDupeProbAbove33pct, pctOfTop10MostSimilarWithDupeProbAbove50pct',
          )
          .where('imageFileHash = :imageHash', { imageHash })
          .andWhere('transactionHash = :txid', { txid })
          .getRawOne();
      }

      return await this.getRepository()
        .createQueryBuilder()
        .select(
          'imageFileHash, imageFileCdnUrl, rawData, transactionHash, rarenessScoresTable, blockHash, blockHeight, utcTimestampWhenRequestSubmitted, pastelIdOfSubmitter, pastelIdOfRegisteringSupernode1, pastelIdOfRegisteringSupernode2, pastelIdOfRegisteringSupernode3, isPastelOpenapiRequest, isLikelyDupe, dupeDetectionSystemVersion, openNsfwScore, rarenessScore, alternativeNsfwScores, internetRareness, imageFingerprintOfCandidateImageFile, pctOfTop10MostSimilarWithDupeProbAbove25pct, pctOfTop10MostSimilarWithDupeProbAbove33pct, pctOfTop10MostSimilarWithDupeProbAbove50pct',
        )
        .where('transactionHash = :txid', { txid })
        .getRawOne();
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
      .createQueryBuilder('s')
      .select(
        'imageFileHash, dupeDetectionSystemVersion, transactionHash, rawData, imageFileCdnUrl',
      )
      .leftJoin(
        query => query.from(TransactionEntity, 't').select('id, blockHash'),
        't',
        's.transactionHash = t.id',
      )
      .where('t.blockHash = :blockHash', { blockHash })
      .getRawMany();
  }

  async getSenseByTxId(txid: string) {
    return await this.getRepository()
      .createQueryBuilder()
      .select('createdDate, blockHeight')
      .where('transactionHash = :txid', { txid })
      .getRawOne();
  }

  async searchByImageHash(searchParam: string) {
    return this.getRepository()
      .createQueryBuilder()
      .select('imageFileHash')
      .where('imageFileHash like :searchParam', {
        searchParam: `%${searchParam}%`,
      })
      .distinct(true)
      .limit(10)
      .getRawMany();
  }

  async getSenseListForTransactionDetails(txid: string) {
    return await this.getRepository()
      .createQueryBuilder()
      .select(
        'imageFileHash, dupeDetectionSystemVersion, rawData, transactionHash, imageFileCdnUrl',
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
      .select(
        'imageFileHash, dupeDetectionSystemVersion, transactionHash, imageFileCdnUrl',
      )
      .where('pastelIdOfSubmitter = :pastelIdOfSubmitter', {
        pastelIdOfSubmitter,
      })
      .getRawMany();
  }

  async getAllByTxIds(txIds: string[]) {
    if (!txIds.length) {
      return [];
    }
    return this.getRepository()
      .createQueryBuilder()
      .select(
        'imageFileHash, dupeDetectionSystemVersion, transactionHash, imageFileCdnUrl',
      )
      .where('transactionHash IN (:...txIds)', {
        txIds,
      })
      .getRawMany();
  }

  async getImageHashByTxIds(txIds: string[]) {
    return this.getRepository()
      .createQueryBuilder()
      .select(
        'imageFileHash, dupeDetectionSystemVersion, transactionHash, imageFileCdnUrl',
      )
      .where('transactionHash IN (:...txIds)', {
        txIds,
      })
      .getRawMany();
  }

  async getAverageRarenessScoreForChart({
    period,
    startDate,
    endDate,
  }: {
    period: TPeriod;
    startDate: number;
    endDate?: number | null;
  }) {
    let unit: ManipulateType = 'day';
    if (period === '24h') {
      unit = 'hour';
    }
    let currentStartDate = 0;
    let currentEndDate = 0;
    let lastStartDate = 0;
    let lastEndDate = 0;
    let isAllData = false;
    const { groupBy, whereSqlText, duration } = getSqlByCondition({
      period,
      customField: 'transactionTime',
      startDate,
      endDate,
    });
    let lastTime = dayjs().valueOf();
    let items = await this.getRepository()
      .createQueryBuilder()
      .select(
        'AVG(rarenessScore) as average, MAX(rarenessScore) as highest, transactionTime as timestamp',
      )
      .where(whereSqlText)
      .groupBy(groupBy)
      .orderBy('transactionTime', 'ASC')
      .getRawMany();

    if (startDate) {
      const to = endDate ? dayjs(endDate) : dayjs();
      const from = dayjs(startDate);
      const hour = to.diff(from, 'hour');
      const _startDate = dayjs().subtract(hour, 'hour').valueOf();
      currentEndDate = to.valueOf();
      currentStartDate = from.valueOf();
      lastStartDate = _startDate;
      lastEndDate = from.valueOf();
    } else {
      if (period === 'max' || period === 'all') {
        isAllData = true;
      } else {
        currentEndDate = dayjs().valueOf();
        currentStartDate = dayjs().subtract(duration, unit).valueOf();
        lastStartDate = dayjs()
          .subtract(duration * 2, unit)
          .valueOf();
        lastEndDate = dayjs().subtract(duration, unit).valueOf();
      }
    }

    if (!items.length) {
      const lastSenseFile = await this.getRepository()
        .createQueryBuilder()
        .select('transactionTime')
        .orderBy('transactionTime', 'DESC')
        .limit(1)
        .getRawOne();
      if (lastSenseFile?.transactionTime) {
        lastTime = lastSenseFile.transactionTime;
        const to = dayjs(lastSenseFile.transactionTime).valueOf();
        let from = dayjs(lastSenseFile.transactionTime)
          .subtract(duration, unit)
          .valueOf();
        currentEndDate = to;
        currentStartDate = from;
        lastStartDate = dayjs(lastSenseFile.transactionTime)
          .subtract(duration * 2, unit)
          .valueOf();
        lastEndDate = from;

        if (startDate) {
          const hour = dayjs().diff(startDate, 'hour');
          from = dayjs(lastSenseFile.transactionTime)
            .subtract(hour, 'hour')
            .valueOf();

          currentEndDate = lastSenseFile.transactionTime;
          currentStartDate = from;
          lastStartDate = dayjs(lastSenseFile.transactionTime)
            .subtract(hour * 2, unit)
            .valueOf();
          lastEndDate = from;
          if (endDate) {
            const hour = dayjs(endDate).diff(startDate, 'hour');
            from = dayjs(lastSenseFile.transactionTime)
              .subtract(hour, 'hour')
              .valueOf();
            lastStartDate = currentStartDate;
            lastEndDate = from;
          }
        }

        items = await this.getRepository()
          .createQueryBuilder()
          .select(
            'AVG(rarenessScore) as average, MAX(rarenessScore) as highest, transactionTime as timestamp',
          )
          .where(`transactionTime >= ${from} AND transactionTime <= ${to}`)
          .groupBy(groupBy)
          .orderBy('transactionTime', 'ASC')
          .getRawMany();
      }
    }
    let newItems = items;
    if (period === '24h' && items.length < 23) {
      newItems = [];
      for (let i = 23; i >= 0; i--) {
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
    const data = await this.getDifferenceAverageRarenessScore(
      currentStartDate,
      currentEndDate,
      lastStartDate,
      lastEndDate,
      isAllData,
    );
    return {
      data: newItems,
      difference: data.difference,
      total: data.total,
    };
  }

  async getDifferenceAverageRarenessScore(
    currentStartDate: number,
    currentEndDate: number,
    lastStartDate: number,
    lastEndDate: number,
    isAllData: boolean,
  ) {
    if (isAllData) {
      const currentTotalDataStored = await this.getRepository()
        .createQueryBuilder()
        .select('AVG(rarenessScore) as total')
        .getRawOne();
      return {
        difference: currentTotalDataStored?.total ? '100.00' : '0.00',
        total: currentTotalDataStored?.total || 0,
      };
    } else {
      const currentTotalDataStored = await this.getRepository()
        .createQueryBuilder()
        .select('AVG(rarenessScore) as total')
        .where(
          `transactionTime >= ${currentStartDate.valueOf()} AND transactionTime <= ${currentEndDate.valueOf()}`,
        )
        .getRawOne();
      const lastDayTotalDataStored = await this.getRepository()
        .createQueryBuilder()
        .select('AVG(rarenessScore) as total')
        .where(
          `transactionTime >= ${lastStartDate} AND transactionTime < ${lastEndDate.valueOf()}`,
        )
        .getRawOne();

      return {
        difference: calculateDifference(
          currentTotalDataStored?.total || 0,
          lastDayTotalDataStored?.total || 0,
        ),
        total: currentTotalDataStored.total,
      };
    }
  }

  async getTransactionHashByImageHash(hash: string) {
    return this.getRepository()
      .createQueryBuilder()
      .select('transactionHash')
      .where('imageFileHash = :hash', { hash })
      .getRawOne();
  }

  async getSenseForCollectionByTxIds(txIds: string[]) {
    return await this.getRepository()
      .createQueryBuilder()
      .select(
        'imageFileHash, imageFileCdnUrl, transactionHash, transactionTime',
      )
      .where('transactionHash IN (:...txIds)', { txIds })
      .getRawMany();
  }

  async deleteByTxId(txId: string) {
    return await this.getRepository().delete({ transactionHash: txId });
  }

  async deleteAllByTxIds(txIds: string[]) {
    return this.getRepository()
      .createQueryBuilder()
      .delete()
      .where('transactionHash IN (:...txIds)', { txIds })
      .execute();
  }
}

export default new SenseRequestsService();
