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

export type TFields =
  | typeof sortByBlocksFields
  | typeof sortByStatsFields
  | typeof sortByMiningFields
  | typeof sortByMempoolFields
  | typeof sortByNettotalsFields
  | typeof sortByTransactionsFields;

export const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
