import { Between, FindManyOptions, Repository } from 'typeorm';

import { IGetLimitParams } from '../types/query-request';
import { getTargetDate } from '../utils/helpers';
import { getStartPoint } from '../utils/period';

export async function getChartData<T>({
  orderBy,
  orderDirection,
  period,
  offset,
  limit,
  repository,
  isMicroseconds = true,
  isGroupBy = true,
  select = '*',
  startTime = 0,
}: IGetLimitParams<T> & {
  repository: Repository<T>;
  isGroupBy?: boolean;
  select?: string;
  startTime?: number;
}): Promise<T[]> {
  const query: FindManyOptions = {
    order: {
      [orderBy]: orderDirection,
    },
  };
  const nowTime = new Date().getTime();
  let fromTime = 0;
  if (period) {
    fromTime = getStartPoint(period);
    if (!isMicroseconds) {
      fromTime = fromTime / 1000;
    }
    query.where = {
      timestamp: Between(fromTime, !isMicroseconds ? nowTime / 100 : nowTime),
    };
  }
  if (offset) {
    query.skip = offset;
  }
  if (limit) {
    query.take = limit;
  }
  if (limit) {
    const statsInfo = await repository.find(query);
    return statsInfo;
  }
  let groupBy = "strftime('%H %m/%d/%Y', datetime(timestamp, 'unixepoch'))";
  if (period.includes('h')) {
    groupBy = "strftime('%H %m/%d/%Y', datetime(timestamp, 'unixepoch'))";
    if (Number(period.split('h')[0]) <= 12) {
      groupBy = "strftime('%H:%M %m/%d/%Y', datetime(timestamp, 'unixepoch'))";
    }
  }
  if (isMicroseconds) {
    groupBy = groupBy.replace('timestamp', 'timestamp/1000');
  }
  if (!isGroupBy) {
    groupBy = '';
  }
  let whereSqlText = `timestamp > ${fromTime}`;
  if (startTime > 0) {
    fromTime = getTargetDate(isMicroseconds, startTime, period);
    if (isMicroseconds) {
      fromTime = fromTime / 1000;
    }
    whereSqlText = `timestamp >= ${fromTime}`;
  }
  const data = await repository
    .createQueryBuilder()
    .select(select)
    .where(whereSqlText)
    .groupBy(groupBy)
    .orderBy(orderBy.toString(), orderDirection)
    .getRawMany();
  return data;
}
