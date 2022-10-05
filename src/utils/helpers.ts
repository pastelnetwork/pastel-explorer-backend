import dayjs from 'dayjs';

import {
  averageFilterByDailyPeriodQuery,
  averageFilterByHourlyPeriodQuery,
  groupByHourlyPeriodQuery,
} from '../utils/constants';
import { TGranularity, TPeriod } from '../utils/period';

const periodData = {
  '2h': 2,
  '24h': 24,
  '1d': 1 * 24,
  '4d': 4 * 24,
  '7d': 7 * 24,
  '14d': 14 * 24,
  '30d': 30 * 24,
  '60d': 60 * 24,
  '90d': 90 * 24,
  '180d': 180 * 24,
  '1y': 360 * 24,
};

export function getSqlTextByPeriodGranularity(
  period: TPeriod,
  granularity?: TGranularity,
  isMicroseconds = false,
): {
  whereSqlText: string;
  groupBy: string;
  groupByQuery: string;
} {
  let duration = 0;
  let whereSqlText = '';
  let groupBy = averageFilterByHourlyPeriodQuery;
  if (period !== 'all' && period !== 'max') {
    duration = periodData[period] ?? 0;
    let time_stamp = Date.now() - duration * 60 * 60 * 1000;
    time_stamp = isMicroseconds ? time_stamp : time_stamp / 1000;
    whereSqlText = `timestamp > ${time_stamp}`;
  }
  if (granularity) {
    switch (granularity) {
      case '1d':
        groupBy = averageFilterByHourlyPeriodQuery;
        break;
      case '30d':
      case '1y':
      case 'all':
        groupBy = averageFilterByDailyPeriodQuery;
        break;
    }
  }
  let groupByQuery = groupByHourlyPeriodQuery;
  switch (period) {
    case '24h':
    case '7d':
    case '14d':
      groupByQuery = groupByHourlyPeriodQuery;
      break;
    case '30d':
    case '90d':
    case '1y':
    case 'all':
      groupByQuery = averageFilterByDailyPeriodQuery;
      groupBy = averageFilterByDailyPeriodQuery;
      break;
  }
  if (period === '7d' || period === '14d' || period === '24h') {
    groupBy = averageFilterByHourlyPeriodQuery;
  }
  return {
    whereSqlText,
    groupBy,
    groupByQuery,
  };
}

export const getDateErrorFormat = (): string => {
  return dayjs().format('YYYY-MM-DD HH:mm:ss');
};
