import * as yup from 'yup';

// import { IQueryParameters } from '../types/query-request';
import { granulatiry, periodData } from './period';

const periods = Object.keys(periodData);
periods.push('all');

export const validateQueryWithGroupData = yup.object({
  period: yup.string().required('Missing period parameter').oneOf(periods),
  func: yup.string().required('Missing func parameter'),
  col: yup.string().required('Missing col parameter'),
  granularity: yup.string().oneOf(granulatiry).notRequired(),
  from: yup.number(),
  to: yup.number(),
});

export const validateQuerySchema = yup.object({
  period: yup.string().oneOf(periods),
  func: yup.string(),
  col: yup.string(),
  limit: yup.number(),
  offset: yup.number(),
  granulatiry: yup.string().oneOf(granulatiry).notRequired(),
});

export const validateParams = yup.object({
  id: yup.string().required('ID is required'),
});

// eslint-disable-next-line
export function queryWithSortSchema(fields: string[]): yup.SchemaOf<any> {
  return yup.object({
    period: yup.string().oneOf(periods),
    limit: yup.number().min(0).max(100),
    offset: yup.number(),
    sortBy: yup.string().oneOf([...fields]),
    sortDirection: yup.string().oneOf(['DESC', 'ASC']).notRequired(),
  });
}

export const blockChartHashrateSchema = yup.object({
  period: yup.string().oneOf(periods),
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
  period: yup.string().required('Missing period parameter').oneOf(periods),
});

export const queryPeriodGranularitySchema = yup.object({
  period: yup.string().required('Missing period parameter').oneOf(periods),
  granularity: yup
    .string()
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
