import dayjs, { ManipulateType } from 'dayjs';

import { dataSource } from '../datasource';
import { RegisteredCascadeFilesEntity } from '../entity/registered-cascade-files.entity';
import { calculateDifference, getSqlByCondition } from '../utils/helpers';
import { TPeriod } from '../utils/period';

class RegisteredCascadeFilesService {
  private async getRepository() {
    const service = await dataSource;
    return service.getRepository(RegisteredCascadeFilesEntity);
  }

  async getIdByBlockHeight(blockHeight: number) {
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .select('id')
      .where('blockHeight = :blockHeight', { blockHeight })
      .getRawOne();
  }

  async getPreviousRegisteredCascadeFileByBlockHeight(blockHeight: number) {
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .select('*')
      .where('blockHeight < :blockHeight', { blockHeight })
      .orderBy('blockHeight', 'DESC')
      .limit(1)
      .getRawOne();
  }

  async getTotalDataStored({
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
    const service = await this.getRepository();
    let items = await service
      .createQueryBuilder()
      .select('MAX(dataSizeBytesCounter) as value, timestamp')
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
      const lastSenseFile = await service
        .createQueryBuilder()
        .select('timestamp')
        .orderBy('timestamp', 'DESC')
        .limit(1)
        .getRawOne();
      if (lastSenseFile?.timestamp) {
        lastTime = lastSenseFile.timestamp;
        const to = dayjs(lastSenseFile.timestamp).valueOf();
        let from = dayjs(lastSenseFile.timestamp)
          .subtract(duration, unit)
          .valueOf();
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
        items = await service
          .createQueryBuilder()
          .select('MAX(dataSizeBytesCounter) as value, timestamp')
          .where(`timestamp >= ${from} AND timestamp <= ${to}`)
          .groupBy(groupBy)
          .orderBy('timestamp', 'ASC')
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
    const data = await this.getDifferenceTotalDataStored(
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

  async getDifferenceTotalDataStored(
    currentStartDate: number,
    currentEndDate: number,
    isAllData: boolean,
  ) {
    const service = await this.getRepository();
    if (isAllData) {
      const currentTotalDataStored = await service
        .createQueryBuilder()
        .select('dataSizeBytesCounter as total')
        .orderBy('timestamp', 'DESC')
        .limit(1)
        .getRawOne();

      return {
        difference: currentTotalDataStored.total ? '100.00' : '0.00',
        total: currentTotalDataStored?.total || 0,
      };
    } else {
      const currentTotalDataStored = await service
        .createQueryBuilder()
        .select('dataSizeBytesCounter as total')
        .where(`timestamp <= ${currentEndDate.valueOf()}`)
        .orderBy('timestamp', 'DESC')
        .limit(1)
        .getRawOne();
      const lastDayTotalDataStored = await service
        .createQueryBuilder()
        .select('dataSizeBytesCounter as total')
        .where(`timestamp < ${currentStartDate.valueOf()}`)
        .orderBy('timestamp', 'DESC')
        .limit(1)
        .getRawOne();

      return {
        difference: calculateDifference(
          currentTotalDataStored?.total || 0,
          lastDayTotalDataStored?.total || 0,
        ),
        total: currentTotalDataStored?.total || 0,
      };
    }
  }

  async getAverageSizeOfNFTStored({
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
    const service = await this.getRepository();
    let lastTime = dayjs().valueOf();
    let items = await service
      .createQueryBuilder()
      .select(
        'MIN(averageFileSizeInBytes) as average, MAX(averageFileSizeInBytes) as highest, timestamp',
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
      const lastSenseFile = await service
        .createQueryBuilder()
        .select('timestamp')
        .orderBy('timestamp', 'DESC')
        .limit(1)
        .getRawOne();
      if (lastSenseFile?.timestamp) {
        lastTime = lastSenseFile.timestamp;
        const to = dayjs(lastSenseFile.timestamp).valueOf();
        let from = dayjs(lastSenseFile.timestamp)
          .subtract(duration, unit)
          .valueOf();
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

        items = await service
          .createQueryBuilder()
          .select(
            'MIN(averageFileSizeInBytes) as average, MAX(averageFileSizeInBytes) as highest, timestamp',
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
    const data = await this.getDifferenceAverageSizeOfNFTStored(
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

  async getDifferenceAverageSizeOfNFTStored(
    currentStartDate: number,
    currentEndDate: number,
    isAllData: boolean,
  ) {
    const service = await this.getRepository();
    if (isAllData) {
      const dataStored = await service
        .createQueryBuilder()
        .select(
          'MIN(averageFileSizeInBytes) as minValue, MAX(averageFileSizeInBytes) as maxValue',
        )
        .limit(1)
        .getRawOne();

      return {
        difference: dataStored ? '100.00' : '0.00',
        total: (dataStored?.minValue + dataStored?.maxValue) / 2 || 0,
      };
    } else {
      const currentTotalDataStored = await service
        .createQueryBuilder()
        .select('averageFileSizeInBytes as total')
        .where(`timestamp <= ${currentEndDate.valueOf()}`)
        .orderBy('timestamp', 'DESC')
        .limit(1)
        .getRawOne();
      const lastDayTotalDataStored = await service
        .createQueryBuilder()
        .select('averageFileSizeInBytes as total')
        .where(`timestamp < ${currentStartDate.valueOf()}`)
        .orderBy('timestamp', 'DESC')
        .limit(1)
        .getRawOne();

      const dataStored = await service
        .createQueryBuilder()
        .select(
          'MIN(averageFileSizeInBytes) as minValue, MAX(averageFileSizeInBytes) as maxValue',
        )
        .where(`timestamp <= ${currentEndDate.valueOf()}`)
        .where(`timestamp >= ${currentStartDate.valueOf()}`)
        .limit(1)
        .getRawOne();

      return {
        difference: calculateDifference(
          currentTotalDataStored?.total || 0,
          lastDayTotalDataStored?.total || 0,
        ),
        total: (dataStored?.minValue + dataStored?.maxValue) / 2 || 0,
      };
    }
  }

  async getDataForUpdate() {
    const service = await this.getRepository();
    return service
      .createQueryBuilder('s')
      .select('s.id, blockHeight, blockTime')
      .where('totalNumberOfRegistered = 0')
      .orderBy('blockHeight', 'ASC')
      .getRawMany();
  }

  async getAllDataWithRawDataNotNull(limit = 10) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder('s')
      .select('s.id, blockHeight, rawData')
      .where("rawData != ''")
      .orderBy('blockHeight', 'ASC')
      .limit(limit)
      .getRawMany();
  }

  async updateRawData(entity) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .update()
      .set({ rawData: entity.rawData })
      .where('blockHeight = :blockHeight', { blockHeight: entity.blockHeight })
      .execute();
  }
}

export default new RegisteredCascadeFilesService();
