import { TGranularity, TPeriod } from '../utils/period';

export interface IQueryParameters<T> {
  period: TPeriod;
  granularity: TGranularity;
  func: string;
  col: string;
  limit: number;
  offset: number;
  sortDirection: string;
  sortBy: keyof T;
}

export interface IGetLimitParams<T> {
  limit: number;
  offset: number;
  orderBy: keyof T;
  period: TPeriod;
  isMicroseconds?: boolean;
  orderDirection: 'DESC' | 'ASC';
}
