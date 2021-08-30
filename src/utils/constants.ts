import 'dotenv/config';

import assert from 'assert';

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

// Mailer config
export const AWS_REGION = process.env.AWS_REGION as string;
assert(AWS_REGION, 'AWS_REGION env variable is missing');

export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID as string;
assert(AWS_ACCESS_KEY_ID, 'AWS_ACCESS_KEY_ID env variable is missing');

export const AWS_SECRET_ACCESS_KEY = process.env
  .AWS_SECRET_ACCESS_KEY as string;
assert(AWS_SECRET_ACCESS_KEY, 'AWS_SECRET_ACCESS_KEY env variable is missing');

export const EMAIL_FROM = process.env.EMAIL_FROM as string;
assert(EMAIL_FROM, 'EMAIL_FROM env variable is missing');

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL as string;
assert(ADMIN_EMAIL, 'ADMIN_EMAIL env variable is missing');

export const WARNING_BLOCK_SUBJECT =
  'Warning: No Valid PSL Blocks in Over 10 Minutes!';

export const WARNING_MINER_SUBJECT =
  'Warning: All PSL Miners on Pools 1 and 2 have STOPPED';

export const MINER_POOL_URL = 'https://pool.pastel.network/workers';

export const MINER_POOL_URL1 = 'https://pool2.pastel.network/workers';
