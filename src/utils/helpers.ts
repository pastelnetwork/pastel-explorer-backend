import dayjs from 'dayjs';

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

export function getSqlTextByPeriodGranularity(
  period: TPeriod,
  granularity?: TGranularity,
  isMicroseconds = false,
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
  }
  if (['24h', '7d', '14d'].indexOf(period) !== -1) {
    groupBySelect = averageSelectByHourlyPeriodQuery;
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
): {
  whereSqlText: string;
  groupBy: string;
  prevWhereSqlText: string;
} {
  let duration = 0;
  let whereSqlText = '';
  let prevWhereSqlText = '';
  const groupBy = averageFilterByHourlyPeriodQuery;
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
    prevWhereSqlText = `timestamp < ${time_stamp}`;
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
    case '7d':
      target = dayjs(timestamp).subtract(7, 'day').hour(0).minute(0).valueOf();
      break;
    case '14d':
      target = dayjs(timestamp).subtract(14, 'day').hour(0).minute(0).valueOf();
      break;
  }

  return target;
};
