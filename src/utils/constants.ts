export const averageFilterByDailyPeriodQuery =
  "strftime('%m/%d/%Y', datetime(timestamp, 'unixepoch'))";

export const averageFilterByMonthlyPeriodQuery =
  "strftime('%m/%Y', datetime(timestamp, 'unixepoch'))";

export const averageFilterByYearlyPeriodQuery =
  "strftime('%Y', datetime(timestamp, 'unixepoch'))";

export const BLOCK_CHART_DEFAULT_GRANULARITY = '1d';

export const sortByBlocksFields = [
  'id',
  'timestamp',
  'difficulty',
  'size',
  'height',
  'confirmations',
  'transactionCount',
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
  | typeof sortByTotalSupplyFields;

export const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

export const Y = 9384556240.23;
export const fiveMillion = 5000000;
export const TIME_CHECK_RESET_PM2 = 10;
