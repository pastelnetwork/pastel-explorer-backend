import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

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
  '6m': 180,
  '1y': 360,
  '2y': 2 * 365,
};

export const getTargetDate = ({
  isMicroseconds,
  startTime,
  period,
  granularity = '',
  isTimestamp = false,
  isGroupHour = false,
  isGroupHourMicroseconds = false,
}: {
  isMicroseconds: boolean;
  startTime: number;
  period: TPeriod;
  granularity?: string;
  isTimestamp?: boolean;
  isGroupHour?: boolean;
  isGroupHourMicroseconds?: boolean;
}): number => {
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

export function getSqlTextByPeriodGranularity({
  period,
  granularity,
  isMicroseconds = false,
  startTime = 0,
}: {
  period: TPeriod;
  granularity?: TGranularity;
  isMicroseconds?: boolean;
  startTime?: number;
}): {
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
      const newStartTime = getTargetDate({
        isMicroseconds,
        startTime,
        period,
      });
      whereSqlText = `timestamp >= ${
        isMicroseconds ? newStartTime : newStartTime / 1000
      }`;
    }
  }
  if (['24h', '7d', '14d'].indexOf(period) !== -1) {
    groupBySelect = averageSelectByHourlyPeriodQuery;
  }
  if (!whereSqlText && startTime > 0) {
    const newStartTime = getTargetDate({
      isMicroseconds,
      startTime,
      period,
    });
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

export function getSqlTextByPeriod({
  period,
  isMicroseconds = false,
  startTime = 0,
  isTimestamp = false,
  isGroupHour = false,
  isGroupHourMicroseconds = false,
}: {
  period: TPeriod;
  isMicroseconds?: boolean;
  startTime?: number;
  isTimestamp?: boolean;
  isGroupHour?: boolean;
  isGroupHourMicroseconds?: boolean;
}): {
  whereSqlText: string;
  groupBy: string;
  prevWhereSqlText: string;
} {
  let duration = 0;
  let whereSqlText = '';
  let prevWhereSqlText = '';
  let groupBy = averageFilterByHourlyPeriodQuery;
  if (period !== 'all' && period !== 'max') {
    duration = periodData[period] ?? 0;
    let time_stamp = dayjs().subtract(duration, 'day').valueOf();
    if (period === '24h' || period === '2h') {
      time_stamp = dayjs().subtract(duration, 'hour').valueOf();
    }
    time_stamp = isMicroseconds ? time_stamp : time_stamp / 1000;
    whereSqlText = `timestamp > ${time_stamp}`;
    prevWhereSqlText = `timestamp <= ${time_stamp}`;
    if (startTime > 0) {
      const newStartTime = getTargetDate({
        isMicroseconds,
        startTime,
        period,
        isTimestamp,
        isGroupHour,
        isGroupHourMicroseconds,
      });
      whereSqlText = `timestamp >= ${
        isMicroseconds ? newStartTime : newStartTime / 1000
      }`;
      prevWhereSqlText = `timestamp < ${
        isMicroseconds ? newStartTime : newStartTime / 1000
      }`;
    }
  }
  if (['180d', '1y', 'all', 'max'].includes(period)) {
    groupBy = averageFilterByDailyPeriodQuery;
  }
  if (!whereSqlText && startTime > 0) {
    const newStartTime = getTargetDate({
      isMicroseconds,
      startTime,
      period,
      isTimestamp,
      isGroupHour,
      isGroupHourMicroseconds,
    });
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
      target = dayjs(timestamp).subtract(14, 'day').valueOf();
      break;
    case '30d':
      target = dayjs(timestamp).subtract(30, 'day').valueOf();
      break;
    case '60d':
      target = dayjs(timestamp).subtract(60, 'day').valueOf();
      break;
    case '180d':
      target = dayjs(timestamp).subtract(180, 'day').valueOf();
      break;
    case '1y':
      target = dayjs(timestamp).subtract(1, 'year').valueOf();
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

export const readLastBlockHeightFile = async (
  file = 'blockHeight.txt',
): Promise<number> => {
  try {
    const fileName = path.join('./logs', file);
    if (!fs.existsSync(fileName)) {
      return 0;
    }
    const data = await fs.promises.readFile(fileName);
    return parseInt(data.toString()) || 0;
  } catch (error) {
    console.error(
      `readLastBlockHeightFile error >>> ${getDateErrorFormat()} >>>`,
      error,
    );
    return 0;
  }
};

export const writeLastBlockHeightFile = async (
  blockHeight: string,
  file = 'blockHeight.txt',
): Promise<boolean> => {
  try {
    const fileName = path.join('./logs', file);
    if (!fs.existsSync(fileName)) {
      fs.createWriteStream(fileName);
    }
    await fs.promises.writeFile(fileName, `${blockHeight}`);
    return true;
  } catch (error) {
    console.error(
      `writeLastBlockHeightFile error >>> ${getDateErrorFormat()} >>>`,
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

export const getSqlByCondition = ({
  period,
  customField = 'transactionTime',
  startDate,
  endDate,
}: {
  period?: TPeriod;
  customField?: string;
  startDate?: number;
  endDate?: number | null;
}): {
  whereSqlText: string;
  groupBy: string;
  duration: number;
} => {
  const duration = periodData[period] ?? 0;
  let whereSqlText = `${customField} >= 0`;
  if (startDate) {
    const from = new Date(startDate).getTime();
    whereSqlText = `${customField} >= ${from}`;
    if (endDate) {
      const to = new Date(endDate).getTime();
      whereSqlText = `${customField} >= ${from} AND ${customField} <= ${to}`;
    }
  } else {
    let time_stamp = dayjs()
      .hour(0)
      .minute(0)
      .subtract(duration, 'day')
      .valueOf();

    if (period === '24h') {
      time_stamp = dayjs().subtract(duration, 'hour').valueOf();
    }
    if (period !== 'all' && period !== 'max') {
      whereSqlText = `${customField} >= ${time_stamp}`;
    }
  }
  let groupBy = `strftime('%H %m/%d/%Y', datetime(${customField} / 1000, 'unixepoch'))`;
  if (period === 'all' || period === 'max') {
    groupBy = `strftime('%m/%d/%Y', datetime(${customField} / 1000, 'unixepoch'))`;
  }
  return {
    groupBy,
    whereSqlText,
    duration,
  };
};

export const calculateDifference = (
  currentValue: number,
  lastDayValue: number,
): string => {
  if (!currentValue && !lastDayValue) {
    return '0.00';
  }

  if (!lastDayValue && currentValue) {
    return '100.00';
  }

  if (lastDayValue && !currentValue) {
    return '-100.00';
  }

  const _difference =
    ((currentValue - lastDayValue) / ((currentValue + lastDayValue) / 2)) * 100;

  return Number.isNaN(_difference) ? '0.000' : _difference.toFixed(2);
};

export const isNumber = (value: string): boolean => {
  const reg = /^\d+$/;
  return reg.test(value);
};

const readdir_promise = promisify(fs.readdir);
const stat_promise = promisify(fs.stat);

type TFiles = {
  name: string;
  ext: string;
  filepath: string;
};

export async function readFiles(dir: string): Promise<TFiles[]> {
  const filenames = await readdir_promise(dir, { encoding: 'utf8' });
  const files = getFiles(dir, filenames);
  return Promise.all(files);
}

function getFiles(dir, filenames) {
  return filenames.map(filename => {
    const name = path.parse(filename).name;
    const ext = path.parse(filename).ext;
    const filepath = path.resolve(dir, filename);

    return stat({ name, ext, filepath });
  });
}

function stat({ name, ext, filepath }) {
  return stat_promise(filepath)
    .then(stat => {
      const isFile = stat.isFile();

      if (isFile) {
        return { name, ext, filepath, stat };
      }
    })
    .catch(err => console.error(err));
}

export const delay = (time: number) => {
  return new Promise(resolve => setTimeout(resolve, time));
};

export const readLessPSLLockedByFoundationFile = async (): Promise<
  string[]
> => {
  try {
    const fileName =
      process.env.PASTEL_LESS_PSL_LOCKED_BY_FOUNDATION_ADDRESS_FILE;
    if (!fs.existsSync(fileName)) {
      return [];
    }
    const data = await fs.promises.readFile(fileName);
    return data?.toString()?.split(',') || [];
  } catch (error) {
    return [];
  }
};

export const getRawContent = (transactionId: string, dir: string) => {
  if (!transactionId || !dir) {
    return '';
  }
  const file = path.join(dir, `${transactionId}.json`);
  if (!fs.existsSync(file)) {
    return '';
  }
  const data = fs.readFileSync(file);
  return data.toString();
};
