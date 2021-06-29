export const averageFilterByDailyPeriodQuery =
  "strftime('%m/%d/%Y', datetime(timestamp, 'unixepoch'))";

export const averageFilterByMonthlyPeriodQuery =
  "strftime('%m/%Y', datetime(timestamp, 'unixepoch'))";

export const averageFilterByYearlyPeriodQuery =
  "strftime('%Y', datetime(timestamp, 'unixepoch'))";

export const BLOCK_CHART_DEFAULT_GRANULARITY = '1d';
