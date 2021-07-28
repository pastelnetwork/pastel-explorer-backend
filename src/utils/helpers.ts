import {
  averageFilterByDailyPeriodQuery,
  averageFilterByMonthlyPeriodQuery,
  averageFilterByYearlyPeriodQuery,
} from '../utils/constants';
import { TGranularity, TPeriod } from '../utils/period';

const periodData = {
  '2h': 2,
  '1d': 1 * 24,
  '4d': 4 * 24,
  '30d': 30 * 24,
  '60d': 60 * 24,
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
} {
  let duration = 0;
  let whereSqlText = '';
  let groupBy = averageFilterByDailyPeriodQuery;
  if (period !== 'all') {
    duration = periodData[period] ?? 0;
    let time_stamp = Date.now() - duration * 60 * 60 * 1000;
    time_stamp = isMicroseconds ? time_stamp : time_stamp / 1000;
    whereSqlText = `timestamp > ${time_stamp}`;
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
    }
  }
  return {
    whereSqlText,
    groupBy,
  };
}
