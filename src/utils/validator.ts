import * as yup from 'yup';

import { TFields } from './constants';
import { granulatiry, periodData, TGranularity, TPeriod } from './period';

const periods = Object.keys(periodData) as TPeriod[];
periods.push('all');

const sqlFuncs = ['SUM', 'AVG', 'COUNT'];

const funcSchema = yup.string().test('func invalid', 'func invalid', value => {
  return sqlFuncs.indexOf(value.toLocaleUpperCase()) > -1;
});

const colSchema = yup
  .string()
  .required('Missing col parameter')
  .matches(/^([a-zA-Z]+\.)?[a-zA-Z]+$/, {
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
  from: yup
    .number()
    .max(1000000000000, 'from parameter must be unix timestamp (10 digits)')
    .transform(value => value || Date.now() - 2 * 60 * 60 * 1000),
});

export type IQueryGrouDataSchema = yup.InferType<
  typeof validateQueryWithGroupData
>;

export type TBlockChartHashrateSchema = yup.InferType<
  typeof blockChartHashrateSchema
>;
