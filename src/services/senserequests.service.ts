import dayjs, { ManipulateType } from 'dayjs';
import fs from 'fs';
import path from 'path';

import { dataSource } from '../datasource';
import { SenseRequestsEntity } from '../entity/senserequests.entity';
import { TransactionEntity } from '../entity/transaction.entity';
import { createMissingSenseRawData } from '../scripts/seed-blockchain-data/updated-sense-requests';
import {
  calculateDifference,
  getRawContent,
  getSqlByCondition,
} from '../utils/helpers';
import { TPeriod } from '../utils/period';

class SenseRequestsService {
  private async getRepository() {
    const service = await dataSource;
    return service.getRepository(SenseRequestsEntity);
  }

  async getSenseRequestByImageHash(
    imageHash: string,
    txid: string,
  ): Promise<SenseRequestsEntity> {
    try {
      const service = await this.getRepository();
      if (!txid) {
        const sense = await service
          .createQueryBuilder()
          .select(
            'imageFileHash, imageFileCdnUrl, transactionHash, rarenessScoresTable, blockHash, blockHeight, utcTimestampWhenRequestSubmitted, pastelIdOfSubmitter, pastelIdOfRegisteringSupernode1, pastelIdOfRegisteringSupernode2, pastelIdOfRegisteringSupernode3, isPastelOpenapiRequest, isLikelyDupe, dupeDetectionSystemVersion, openNsfwScore, rarenessScore, alternativeNsfwScores, internetRareness, imageFingerprintOfCandidateImageFile, pctOfTop10MostSimilarWithDupeProbAbove25pct, pctOfTop10MostSimilarWithDupeProbAbove33pct, pctOfTop10MostSimilarWithDupeProbAbove50pct',
          )
          .where('imageFileHash = :imageHash', { imageHash })
          .orderBy('CAST(currentBlockHeight AS INT)', 'DESC')
          .getRawOne();

        let rawData = getRawContent(
          sense.transactionHash,
          process.env.SENSE_DRAW_DATA_FOLDER,
        );
        if (!rawData) {
          const file = path.join(
            process.env.SENSE_DRAW_DATA_FOLDER,
            `${sense.transactionHash}.json`,
          );
          if (!fs.existsSync(file)) {
            try {
              await createMissingSenseRawData(sense.transactionHash);
              rawData = getRawContent(
                sense.transactionHash,
                process.env.SENSE_DRAW_DATA_FOLDER,
              );
            } catch (error) {
              console.error(error);
            }
          }
        }
        return {
          ...sense,
          rawData,
        };
      }
      if (imageHash && txid) {
        const sense = await service
          .createQueryBuilder()
          .select(
            'imageFileHash, imageFileCdnUrl, transactionHash, rarenessScoresTable, blockHash, blockHeight, utcTimestampWhenRequestSubmitted, pastelIdOfSubmitter, pastelIdOfRegisteringSupernode1, pastelIdOfRegisteringSupernode2, pastelIdOfRegisteringSupernode3, isPastelOpenapiRequest, isLikelyDupe, dupeDetectionSystemVersion, openNsfwScore, rarenessScore, alternativeNsfwScores, internetRareness, imageFingerprintOfCandidateImageFile, pctOfTop10MostSimilarWithDupeProbAbove25pct, pctOfTop10MostSimilarWithDupeProbAbove33pct, pctOfTop10MostSimilarWithDupeProbAbove50pct',
          )
          .where('imageFileHash = :imageHash', { imageHash })
          .andWhere('transactionHash = :txid', { txid })
          .getRawOne();

        let rawData = getRawContent(
          sense.transactionHash,
          process.env.SENSE_DRAW_DATA_FOLDER,
        );
        if (!rawData) {
          const file = path.join(
            process.env.SENSE_DRAW_DATA_FOLDER,
            `${sense.transactionHash}.json`,
          );
          if (!fs.existsSync(file)) {
            try {
              await createMissingSenseRawData(sense.transactionHash);
              rawData = getRawContent(
                sense.transactionHash,
                process.env.SENSE_DRAW_DATA_FOLDER,
              );
            } catch (error) {
              console.error(error);
            }
          }
        }
        return {
          ...sense,
          rawData,
        };
      }

      const sense = await service
        .createQueryBuilder()
        .select(
          'imageFileHash, imageFileCdnUrl, transactionHash, rarenessScoresTable, blockHash, blockHeight, utcTimestampWhenRequestSubmitted, pastelIdOfSubmitter, pastelIdOfRegisteringSupernode1, pastelIdOfRegisteringSupernode2, pastelIdOfRegisteringSupernode3, isPastelOpenapiRequest, isLikelyDupe, dupeDetectionSystemVersion, openNsfwScore, rarenessScore, alternativeNsfwScores, internetRareness, imageFingerprintOfCandidateImageFile, pctOfTop10MostSimilarWithDupeProbAbove25pct, pctOfTop10MostSimilarWithDupeProbAbove33pct, pctOfTop10MostSimilarWithDupeProbAbove50pct',
        )
        .where('transactionHash = :txid', { txid })
        .getRawOne();

      let rawData = getRawContent(
        sense.transactionHash,
        process.env.SENSE_DRAW_DATA_FOLDER,
      );
      if (!rawData) {
        const file = path.join(
          process.env.SENSE_DRAW_DATA_FOLDER,
          `${sense.transactionHash}.json`,
        );
        if (!fs.existsSync(file)) {
          try {
            await createMissingSenseRawData(sense.transactionHash);
            rawData = getRawContent(
              sense.transactionHash,
              process.env.SENSE_DRAW_DATA_FOLDER,
            );
          } catch (error) {
            console.error(error);
          }
        }
      }
      return {
        ...sense,
        rawData,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async getSenseListByTxId(txid: string) {
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .select('imageFileHash, dupeDetectionSystemVersion, transactionHash')
      .where('transactionHash = :txid', { txid })
      .getRawMany();
  }

  async getSenseListByBlockHash(blockHash: string) {
    const service = await this.getRepository();
    const items = await service
      .createQueryBuilder('s')
      .select(
        'imageFileHash, dupeDetectionSystemVersion, transactionHash, imageFileCdnUrl',
      )
      .leftJoin(
        query => query.from(TransactionEntity, 't').select('id, blockHash'),
        't',
        's.transactionHash = t.id',
      )
      .where('t.blockHash = :blockHash', { blockHash })
      .getRawMany();

    const results = [];
    for (const item of items) {
      let rawData = getRawContent(
        item.transactionHash,
        process.env.SENSE_DRAW_DATA_FOLDER,
      );
      if (!rawData) {
        const file = path.join(
          process.env.SENSE_DRAW_DATA_FOLDER,
          `${item.transactionHash}.json`,
        );
        if (!fs.existsSync(file)) {
          try {
            await createMissingSenseRawData(item.transactionHash);
            rawData = getRawContent(
              item.transactionHash,
              process.env.SENSE_DRAW_DATA_FOLDER,
            );
          } catch (error) {
            console.error(error);
          }
        }
      }
      results.push({
        ...item,
        rawData,
      });
    }
    return results;
  }

  async getSenseByTxId(txid: string) {
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .select('createdDate, blockHeight')
      .where('transactionHash = :txid', { txid })
      .getRawOne();
  }

  async searchByImageHash(searchParam: string) {
    const service = await this.getRepository();
    return service
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
    const service = await this.getRepository();
    const items = await service
      .createQueryBuilder()
      .select(
        'imageFileHash, dupeDetectionSystemVersion, transactionHash, imageFileCdnUrl',
      )
      .where('transactionHash = :txid', { txid })
      .getRawMany();

    const results = [];
    for (const item of items) {
      let rawData = getRawContent(
        item.transactionHash,
        process.env.SENSE_DRAW_DATA_FOLDER,
      );
      if (!rawData) {
        const file = path.join(
          process.env.SENSE_DRAW_DATA_FOLDER,
          `${item.transactionHash}.json`,
        );
        if (!fs.existsSync(file)) {
          try {
            await createMissingSenseRawData(item.transactionHash);
            rawData = getRawContent(
              item.transactionHash,
              process.env.SENSE_DRAW_DATA_FOLDER,
            );
          } catch (error) {
            console.error(error);
          }
        }
      }
      results.push({
        ...item,
        rawData,
      });
    }
    return results;
  }

  async deleteTicketByBlockHeight(blockHeight: number) {
    const service = await this.getRepository();
    return await service.delete({ blockHeight });
  }

  async deleteTicketByBlockHash(blockHash: string) {
    const service = await this.getRepository();
    return await service.delete({ blockHash });
  }

  async getAllByPastelId(pastelIdOfSubmitter: string) {
    const service = await this.getRepository();
    return service
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
    const service = await this.getRepository();
    return service
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
    const service = await this.getRepository();
    return service
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
    const service = await this.getRepository();
    let items = await service
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
      const lastSenseFile = await service
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

        items = await service
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
    const service = await this.getRepository();
    if (isAllData) {
      const currentTotalDataStored = await service
        .createQueryBuilder()
        .select('AVG(rarenessScore) as total')
        .getRawOne();
      return {
        difference: currentTotalDataStored?.total ? '100.00' : '0.00',
        total: currentTotalDataStored?.total || 0,
      };
    } else {
      const currentTotalDataStored = await service
        .createQueryBuilder()
        .select('AVG(rarenessScore) as total')
        .where(
          `transactionTime >= ${currentStartDate.valueOf()} AND transactionTime <= ${currentEndDate.valueOf()}`,
        )
        .getRawOne();
      const lastDayTotalDataStored = await service
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
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select('transactionHash')
      .where('imageFileHash = :hash', { hash })
      .getRawOne();
  }

  async getSenseForCollectionByTxIds(txIds: string[]) {
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .select(
        'imageFileHash, imageFileCdnUrl, transactionHash, transactionTime',
      )
      .where('transactionHash IN (:...txIds)', { txIds })
      .getRawMany();
  }

  async deleteByTxId(txId: string) {
    const service = await this.getRepository();
    return await service.delete({ transactionHash: txId });
  }

  async deleteAllByTxIds(txIds: string[]) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .delete()
      .where('transactionHash IN (:...txIds)', { txIds })
      .execute();
  }

  async save(senseEntity) {
    const service = await this.getRepository();
    return service.save(senseEntity);
  }

  async getAllSense(limit = 10) {
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .select('transactionHash, imageFileCdnUrl, rawData, parsedSenseResults')
      .where("rawData != ''")
      .orderBy('createdDate', 'DESC')
      .limit(limit)
      .getRawMany();
  }
}

export default new SenseRequestsService();
