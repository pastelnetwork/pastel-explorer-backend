import dayjs, { ManipulateType } from 'dayjs';
import { getRepository, Repository } from 'typeorm';

import { RegisteredSenseFilesEntity } from '../entity/registered-sense-files.entity';
import { getSqlByCondition } from '../utils/helpers';
import { TPeriod } from '../utils/period';

class RegisteredSenseFilesService {
  private getRepository(): Repository<RegisteredSenseFilesEntity> {
    return getRepository(RegisteredSenseFilesEntity);
  }

  async getIdByBlockHeight(blockHeight: number) {
    return await this.getRepository()
      .createQueryBuilder()
      .select('id')
      .where('blockHeight = :blockHeight', { blockHeight })
      .getRawOne();
  }

  async getPreviousRegisteredSenseFileByBlockHeight(blockHeight: number) {
    return await this.getRepository()
      .createQueryBuilder()
      .select('*')
      .where('blockHeight < :blockHeight', { blockHeight })
      .orderBy('blockHeight', 'DESC')
      .limit(1)
      .getRawOne();
  }

  async getTotalFingerprints({
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
    let isAllData = false;
    const { groupBy, whereSqlText, duration } = getSqlByCondition({
      period,
      customField: 'timestamp',
      startDate,
      endDate,
    });
    let lastTime = dayjs().valueOf();
    let items = await this.getRepository()
      .createQueryBuilder()
      .select(
        'MAX(totalNumberOfRegisteredSenseFingerprints) as value, timestamp',
      )
      .where(whereSqlText)
      .groupBy(groupBy)
      .orderBy('timestamp', 'ASC')
      .getRawMany();

    if (startDate) {
      const to = endDate ? dayjs(endDate) : dayjs();
      const from = dayjs(startDate);
      currentEndDate = to.valueOf();
      currentStartDate = from.valueOf();
    } else {
      if (period === 'max' || period === 'all') {
        isAllData = true;
      } else {
        currentEndDate = dayjs().valueOf();
        currentStartDate = dayjs().subtract(duration, unit).valueOf();
      }
    }

    if (!items.length) {
      const lastSenseFile = await this.getRepository()
        .createQueryBuilder()
        .select('timestamp')
        .orderBy('timestamp', 'DESC')
        .limit(1)
        .getRawOne();
      if (lastSenseFile?.timestamp) {
        lastTime = lastSenseFile.timestamp;
        const to = dayjs(lastSenseFile.timestamp).valueOf();
        let from = dayjs().subtract(duration, unit).valueOf();
        currentEndDate = to;
        currentStartDate = from;

        if (startDate) {
          const hour = dayjs().diff(startDate, 'hour');
          from = dayjs(lastSenseFile.timestamp)
            .subtract(hour, 'hour')
            .valueOf();

          currentEndDate = lastSenseFile.timestamp;
          currentStartDate = from;
          if (endDate) {
            const hour = dayjs(endDate).diff(startDate, 'hour');
            from = dayjs(lastSenseFile.timestamp)
              .subtract(hour, 'hour')
              .valueOf();
          }
        }

        items = await this.getRepository()
          .createQueryBuilder()
          .select(
            'MAX(totalNumberOfRegisteredSenseFingerprints) as value, timestamp',
          )
          .where(`timestamp >= ${from} AND timestamp <= ${to}`)
          .groupBy(groupBy)
          .orderBy('timestamp', 'ASC')
          .getRawMany();
      }
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
    const data = await this.getDifferenceTotalFingerprints(
      currentStartDate,
      currentEndDate,
      isAllData,
    );
    return {
      data: newItems,
      difference: data.difference,
      total: data.total,
    };
  }

  async getDifferenceTotalFingerprints(
    currentStartDate: number,
    currentEndDate: number,
    isAllData: boolean,
  ) {
    if (isAllData) {
      const currentTotalDataStored = await this.getRepository()
        .createQueryBuilder()
        .select('totalNumberOfRegisteredSenseFingerprints as total')
        .orderBy('timestamp', 'DESC')
        .limit(1)
        .getRawOne();
      let difference = '0.00';
      const _difference =
        (currentTotalDataStored.total / (currentTotalDataStored.total / 2)) *
        100;
      if (Number.isNaN(_difference)) {
        difference = '0.00';
      } else {
        difference = _difference.toFixed(2);
      }

      return {
        difference,
        total: currentTotalDataStored.total,
      };
    } else {
      const currentTotalDataStored = await this.getRepository()
        .createQueryBuilder()
        .select('totalNumberOfRegisteredSenseFingerprints as total')
        .where(`timestamp <= ${currentEndDate.valueOf()}`)
        .orderBy('timestamp', 'DESC')
        .limit(1)
        .getRawOne();
      const lastDayTotalDataStored = await this.getRepository()
        .createQueryBuilder()
        .select('totalNumberOfRegisteredSenseFingerprints as total')
        .where(`timestamp < ${currentStartDate.valueOf()}`)
        .orderBy('timestamp', 'DESC')
        .limit(1)
        .getRawOne();

      let difference = '0.00';
      const _difference =
        ((currentTotalDataStored.total - (lastDayTotalDataStored?.total || 0)) /
          ((currentTotalDataStored.total +
            (lastDayTotalDataStored?.total || 0)) /
            2)) *
        100;
      if (Number.isNaN(_difference)) {
        difference = '0.00';
      } else {
        difference = _difference.toFixed(2);
      }

      return {
        difference,
        total: currentTotalDataStored.total,
      };
    }
  }
}

export default new RegisteredSenseFilesService();
