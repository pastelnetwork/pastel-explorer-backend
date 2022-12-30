import * as yup from 'yup';

import { TFields } from './constants';
import {
  granulatiry,
  marketPeriodData,
  periodData,
  TGranularity,
  TPeriod,
} from './period';

const periods = Object.keys(periodData) as TPeriod[];
periods.push('all');
periods.push('max');

const marketPeriods = Object.keys(marketPeriodData);

const sqlFuncs = ['SUM', 'AVG', 'COUNT'];

const funcSchema = yup.string().test('func invalid', 'func invalid', value => {
  return sqlFuncs.indexOf(value.toLocaleUpperCase()) > -1;
});

const colSchema = yup
  .string()
  .required('Missing col parameter')
  .matches(/^([a-zA-Z]+\.)?[a-zA-Z_]+$/, {
    excludeEmptyString: true,
    message: 'col invalid',
  });

export const validateQueryWithGroupData = yup.object({
  period: yup
    .mixed<TPeriod>()
    .required('Missing period parameter')
    .oneOf(periods),
  func: funcSchema,
  col: colSchema,
  granularity: yup.mixed<TGranularity>().oneOf(granulatiry).notRequired(),
  from: yup.number(),
  to: yup.number(),
  name: yup.string(),
});

export const validateParams = yup.object({
  id: yup.string().required('ID is required'),
});

// eslint-disable-next-line
export function queryWithSortSchema(fields: TFields): yup.SchemaOf<any> {
  return yup.object({
    period: yup.mixed<TPeriod>().oneOf(periods),
    limit: yup.number().min(0).max(100),
    offset: yup.number(),
    sortBy: yup.mixed().oneOf([...fields]),
    sortDirection: yup.string().oneOf(['DESC', 'ASC']).notRequired(),
  });
}

export const blockChartHashrateSchema = yup.object({
  period: yup.mixed<TPeriod>().oneOf(periods),
  from: yup.number(),
  to: yup.number(),
});

export const searchQuerySchema = yup.object({
  query: yup
    .mixed()
    .required()
    .transform(value => (Array.isArray(value) ? value[0] : value)),
});

export const queryPeriodSchema = yup.object({
  period: yup
    .mixed<TPeriod>()
    .required('Missing period parameter')
    .oneOf(periods),
});

export const queryPeriodGranularitySchema = yup.object({
  period: yup
    .mixed<TPeriod>()
    .required('Missing period parameter')
    .oneOf(periods),
  granularity: yup
    .mixed<TGranularity>()
    .required('Missing granularity parameter')
    .oneOf(granulatiry),
});

export const queryTransactionLatest = yup.object({
  period: yup
    .mixed<TPeriod>()
    .required('Missing period parameter')
    .oneOf(periods),
});

export type IQueryGrouDataSchema = yup.InferType<
  typeof validateQueryWithGroupData
>;

export type TBlockChartHashrateSchema = yup.InferType<
  typeof blockChartHashrateSchema
>;

export const validateMarketChartsSchema = yup.object({
  period: yup.mixed().required().oneOf(marketPeriods),
});

export const currentStatsData = {
  current_mining_difficulty: 'difficulty',
  giga_hash_per_second: 'gigaHashPerSec',
  non_zero_addresses_count: 'nonZeroAddressesCount',
  average_transactions_per_second: 'avgTransactionsPerSecond',
  coin_supply: 'coinSupply',
  btc_price: 'btcPrice',
  usd_price: 'usdPrice',
  market_cap_in_usd: 'marketCapInUSD',
  transactions: 'transactions',
  average_block_size_last_24_hours: 'avgBlockSizeLast24Hour',
  average_transactions_per_block_last_24_hours:
    'avgTransactionPerBlockLast24Hour',
  average_transaction_fee_last_24_hours: 'avgTransactionFeeLast24Hour',
  mem_pool_size: 'memPoolSize',
  current_blockheight: 'current_blockheight',
  current_supernode_count: 'current_supernode_count',
  current_hash_rate: 'current_hash_rate',
  psl_staked: 'psl_staked',
  coin_circulating_supply: 'coin_circulating_supply',
  percent_psl_staked: 'percent_psl_staked',
  total_burned_psl: 'total_burned_psl',
  coins_created: 'coins_created',
};

const currentStatsParam = Object.keys(currentStatsData);

export const validateCurrentStatsParamSchema = yup.object({
  q: yup.mixed().required().oneOf(currentStatsParam),
});
