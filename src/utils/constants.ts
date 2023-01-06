export const averageFilterByHourlyPeriodQuery =
  "strftime('%H %m/%d/%Y', datetime(timestamp, 'unixepoch'))";

export const averageFilterByDailyPeriodQuery =
  "strftime('%m/%d/%Y', datetime(timestamp, 'unixepoch'))";

export const averageFilterByMonthlyPeriodQuery =
  "strftime('%m/%Y', datetime(timestamp, 'unixepoch'))";

export const averageFilterByYearlyPeriodQuery =
  "strftime('%Y', datetime(timestamp, 'unixepoch'))";

export const averageSelectByHourlyPeriodQuery =
  "strftime('%m/%d/%Y %H:%M', datetime(timestamp, 'unixepoch'))";

export const sortByBlocksFields = [
  'id',
  'timestamp',
  'difficulty',
  'size',
  'height',
  'confirmations',
  'transactionCount',
  'totalTickets',
] as const;

export const sortByStatsFields = [
  'id',
  'timestamp',
  'difficulty',
  'usdPrice',
] as const;

export const sortByMiningFields = [
  'id',
  'timestamp',
  'blocks',
  'currentblocksize',
  'currentblocktx',
  'difficulty',
  'errors',
  'genproclimit',
  'localsolps',
  'networksolps',
  'networkhashps',
  'pooledtx',
  'chain',
  'generate',
] as const;

export const sortByMempoolFields = [
  'id',
  'timestamp',
  'size',
  'bytes',
  'usage',
] as const;

export const sortByNettotalsFields = [
  'id',
  'timestamp',
  'totalbytesrecv',
  'totalbytessent',
  'timemillis',
] as const;

export const sortByTransactionsFields = [
  'timestamp',
  'totalAmount',
  'recipientCount',
  'blockHash',
  'ticketsTotal',
] as const;

export const sortHashrateFields = [
  'id',
  'timestamp',
  'networksolps5',
  'networksolps10',
  'networksolps25',
  'networksolps50',
  'networksolps100',
  'networksolps500',
  'networksolps1000',
] as const;

export const sortByTotalSupplyFields = ['timestamp', 'coinSupply'] as const;

export const sortByAccountFields = [
  'timestamp',
  'nonZeroAddressesCount',
] as const;

export type TFields =
  | typeof sortByBlocksFields
  | typeof sortByStatsFields
  | typeof sortByMiningFields
  | typeof sortByMempoolFields
  | typeof sortByNettotalsFields
  | typeof sortByTransactionsFields
  | typeof sortByAccountFields
  | typeof sortHashrateFields
  | typeof sortByTotalSupplyFields;

export const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

export const Y = 3004522800.0;
export const TIME_CHECK_RESET_PM2 = 10;
export const periodGroupByHourly = ['180d', '1y', 'all', 'max'];
