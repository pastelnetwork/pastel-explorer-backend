import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';

import { BatchAddressEvents } from '../scripts/seed-blockchain-data/update-database';
import {
  averageFilterByDailyPeriodQuery,
  averageFilterByHourlyPeriodQuery,
  averageFilterByMonthlyPeriodQuery,
  averageFilterByYearlyPeriodQuery,
  averageSelectByHourlyPeriodQuery,
} from '../utils/constants';
import { TGranularity, TPeriod } from '../utils/period';

const periodData = {
  '2h': 2,
  '24h': 24,
  '1d': 1,
  '4d': 4,
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '60d': 60,
  '90d': 90,
  '180d': 180,
  '1y': 360,
};

export const getTargetDate = (
  isMicroseconds: boolean,
  startTime: number,
  period: TPeriod,
  granularity = '',
  isTimestamp = false,
  isGroupHour = false,
  isGroupHourMicroseconds = false,
): number => {
  const timeStamp = isTimestamp
    ? startTime
    : isMicroseconds
    ? startTime * 1000
    : startTime;
  let newStartTime = timeStamp;
  if (['180d', '1y', 'all', 'max'].includes(period)) {
    newStartTime = dayjs(timeStamp).minute(0).second(0).valueOf();
  }

  if (granularity) {
    switch (granularity) {
      case 'none':
        newStartTime = dayjs(timeStamp).minute(0).second(0).valueOf();
        break;
      case '1d':
      case '30d':
      case '1y':
        newStartTime = dayjs(timeStamp).hour(0).minute(0).second(0).valueOf();
        break;
    }
  }

  if (isGroupHour) {
    newStartTime =
      dayjs(timeStamp * 1000)
        .minute(0)
        .second(0)
        .valueOf() / 1000;
  }

  if (isGroupHourMicroseconds) {
    newStartTime = dayjs(timeStamp).minute(0).second(0).valueOf() / 1000;
    if (isMicroseconds) {
      newStartTime = newStartTime / 1000;
    }
  }

  if (['1h', '3h', '6h', '12h'].includes(period)) {
    newStartTime =
      dayjs(timeStamp * 1000)
        .second(0)
        .valueOf() / 1000;
  }

  return newStartTime;
};

export function getSqlTextByPeriodGranularity(
  period: TPeriod,
  granularity?: TGranularity,
  isMicroseconds = false,
  startTime = 0,
): {
  whereSqlText: string;
  groupBy: string;
  groupBySelect: string;
} {
  let duration = 0;
  let whereSqlText = '';
  let groupBy = averageFilterByDailyPeriodQuery;
  let groupBySelect = averageFilterByDailyPeriodQuery;
  if (period !== 'all' && period !== 'max') {
    duration = periodData[period] ?? 0;
    let time_stamp = dayjs()
      .hour(0)
      .minute(0)
      .subtract(duration, 'day')
      .valueOf();
    if (period === '24h' || period === '2h') {
      time_stamp = dayjs().subtract(duration, 'hour').valueOf();
    }
    time_stamp = isMicroseconds ? time_stamp : time_stamp / 1000;
    whereSqlText = `timestamp > ${time_stamp}`;
    if (startTime > 0) {
      const newStartTime = getTargetDate(isMicroseconds, startTime, period);
      whereSqlText = `timestamp >= ${
        isMicroseconds ? newStartTime : newStartTime / 1000
      }`;
    }
  }
  if (['24h', '7d', '14d'].indexOf(period) !== -1) {
    groupBySelect = averageSelectByHourlyPeriodQuery;
  }
  if (!whereSqlText && startTime > 0) {
    const newStartTime = getTargetDate(isMicroseconds, startTime, period);
    whereSqlText = `timestamp >= ${
      isMicroseconds ? newStartTime : newStartTime / 1000
    }`;
  }
  if (granularity) {
    switch (granularity) {
      case '1d':
        groupBy = averageFilterByDailyPeriodQuery;
        break;
      case '30d':
        groupBy = averageFilterByMonthlyPeriodQuery;
        break;
      case '1y':
        groupBy = averageFilterByYearlyPeriodQuery;
        break;
      case 'all':
        groupBy = averageFilterByDailyPeriodQuery;
        break;
      case 'none':
        groupBy = averageFilterByHourlyPeriodQuery;
    }
  }
  return {
    whereSqlText,
    groupBy,
    groupBySelect,
  };
}

export const getDateErrorFormat = (): string => {
  return dayjs().format('YYYY-MM-DD HH:mm:ss');
};

export function getSqlTextByPeriod(
  period: TPeriod,
  isMicroseconds = false,
  startTime = 0,
  isTimestamp = false,
  isGroupHour = false,
  isGroupHourMicroseconds = false,
): {
  whereSqlText: string;
  groupBy: string;
  prevWhereSqlText: string;
} {
  let duration = 0;
  let whereSqlText = '';
  let prevWhereSqlText = '';
  let groupBy = '';
  if (period !== 'all' && period !== 'max') {
    duration = periodData[period] ?? 0;
    let time_stamp = dayjs()
      .hour(0)
      .minute(0)
      .subtract(duration, 'day')
      .valueOf();
    if (period === '24h' || period === '2h') {
      time_stamp = dayjs().subtract(duration, 'hour').valueOf();
    }
    time_stamp = isMicroseconds ? time_stamp : time_stamp / 1000;
    whereSqlText = `timestamp > ${time_stamp}`;
    prevWhereSqlText = `timestamp <= ${time_stamp}`;
    if (startTime > 0) {
      const newStartTime = getTargetDate(
        isMicroseconds,
        startTime,
        period,
        '',
        isTimestamp,
        isGroupHour,
        isGroupHourMicroseconds,
      );
      whereSqlText = `timestamp >= ${
        isMicroseconds ? newStartTime : newStartTime / 1000
      }`;
      prevWhereSqlText = `timestamp < ${
        isMicroseconds ? newStartTime : newStartTime / 1000
      }`;
    }
  }
  if (['180d', '1y', 'all', 'max'].includes(period)) {
    groupBy = averageFilterByHourlyPeriodQuery;
  }
  if (!whereSqlText && startTime > 0) {
    const newStartTime = getTargetDate(
      isMicroseconds,
      startTime,
      period,
      '',
      isTimestamp,
      isGroupHour,
      isGroupHourMicroseconds,
    );
    whereSqlText = `timestamp >= ${
      isMicroseconds ? newStartTime : newStartTime / 1000
    }`;
  }
  return {
    whereSqlText,
    groupBy,
    prevWhereSqlText,
  };
}

export const generatePrevTimestamp = (
  timestamp: number,
  period: TPeriod,
): number => {
  let target = dayjs(timestamp).subtract(24, 'hour').valueOf();
  switch (period) {
    case '1h':
      target = dayjs(timestamp).subtract(1, 'hour').valueOf();
      break;
    case '3h':
      target = dayjs(timestamp).subtract(3, 'hour').valueOf();
      break;
    case '6h':
      target = dayjs(timestamp).subtract(6, 'hour').valueOf();
      break;
    case '7d':
      target = dayjs(timestamp).hour(0).minute(0).subtract(7, 'day').valueOf();
      break;
    case '14d':
      target = dayjs(timestamp).hour(0).minute(0).subtract(14, 'day').valueOf();
      break;
  }

  return target;
};

export const getStartDate = (timestamp: number): number | null => {
  if (!timestamp) {
    return 0;
  }
  const now = dayjs();

  return Math.ceil(now.diff(dayjs(timestamp), 'day', true));
};

export const getGroupByForTransaction = (groupBy: string): string => {
  switch (groupBy) {
    case 'daily':
      return averageFilterByDailyPeriodQuery;
    case 'hourly':
      return averageFilterByHourlyPeriodQuery;
    default:
      return averageFilterByHourlyPeriodQuery;
  }
};

export const readTotalBurnedFile = async (): Promise<number> => {
  try {
    const dir = process.env.TOTAL_BURNED_FILE;
    const fileName = path.join(dir, 'total_burned_psl.txt');
    if (!fs.existsSync(fileName)) {
      return 0;
    }
    const data = await fs.promises.readFile(fileName);
    return parseFloat(data.toString()) || 0;
  } catch (error) {
    return 0;
  }
};

export const getTheNumberOfTotalSupernodes = (): number => {
  if (process.env.RPC_PORT === '19932') {
    return 1000000;
  }

  return 5000000;
};

export const readLastBlockHeightFile = async (): Promise<number> => {
  try {
    const fileName = path.join('./logs', 'blockHeight.txt');
    if (!fs.existsSync(fileName)) {
      return 0;
    }
    const data = await fs.promises.readFile(fileName);
    return parseInt(data.toString()) || 0;
  } catch (error) {
    console.log(
      'readLastBlockHeightFile error >>> ${getDateErrorFormat()} >>>',
      error,
    );
    return 0;
  }
};

export const writeLastBlockHeightFile = async (
  blockHeight: string,
): Promise<boolean> => {
  try {
    const fileName = path.join('./logs', 'blockHeight.txt');
    if (!fs.existsSync(fileName)) {
      fs.createWriteStream(fileName);
    }
    await fs.promises.writeFile(fileName, `${blockHeight}`);
    return true;
  } catch (error) {
    console.log(
      'writeLastBlockHeightFile error >>> ${getDateErrorFormat()} >>>',
      error,
    );
    return false;
  }
};

export const getNonZeroAddresses = (
  addressFromDb: INonZeroAddresses[],
  addressFromRPC: BatchAddressEvents,
): INonZeroAddresses[] => {
  const newAddressFromRPC = addressFromRPC.reduce((m, o) => {
    const found = m.find(p => p.address === o.address);
    if (found) {
      found.sum += o.amount;
    } else {
      m.push({
        account: o.address,
        sum: o.amount,
      });
    }
    return m;
  }, []);
  const diffAddress = addressFromDb.filter(
    ({ account: account1 }) =>
      !newAddressFromRPC.some(({ account: account2 }) => account2 === account1),
  );
  const sameAddress = addressFromDb
    .filter(({ account: account1 }) =>
      newAddressFromRPC.some(({ account: account2 }) => account2 === account1),
    )
    .reduce((m, o) => {
      const found = m.find(p => p.account === o.account);
      if (found) {
        found.sum += o.sum;
      } else {
        m.push(o);
      }
      return m;
    }, [])
    .filter(a => a.sum > 0);
  const diffAddressFromRPC = newAddressFromRPC
    .filter(
      ({ account: account1 }) =>
        !sameAddress.some(({ account: account2 }) => account2 === account1),
    )
    .filter(a => a.sum > 0);
  return [...diffAddress, ...sameAddress, ...diffAddressFromRPC];
};
