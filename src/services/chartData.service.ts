import { Between, FindManyOptions, Repository } from 'typeorm';

import { IGetLimitParams } from '../types/query-request';
import { getStartPoint } from '../utils/period';

export async function getChartData<T>({
  orderBy,
  orderDirection,
  period,
  offset,
  limit,
  repository,
  isMicroseconds = true,
}: IGetLimitParams<T> & { repository: Repository<T>; }): Promise<T[]> {
  const query: FindManyOptions = {
    order: {
      [orderBy]: orderDirection,
    },
  };
  let fromTime = 0;
  if (period) {
    fromTime = getStartPoint(period);
    if (!isMicroseconds) {
      fromTime = fromTime / 1000;
    }
    query.where = {
      timestamp: Between(fromTime, new Date().getTime()),
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
  let groupBy = "strftime('%m/%d/%Y', datetime(timestamp, 'unixepoch'))";
  if (period.includes('h')) {
    groupBy = "strftime('%H %m/%d/%Y', datetime(timestamp, 'unixepoch'))";
    if (Number(period.split('h')[0]) < 12) {
      groupBy = "strftime('%H:%M %m/%d/%Y', datetime(timestamp, 'unixepoch'))";
    }
  }
  if (isMicroseconds) {
    groupBy = groupBy.replace('timestamp', 'timestamp/1000');
  }
  const data = await repository
    .createQueryBuilder()
    .select('*')
    .where({
      timestamp: Between(fromTime, new Date().getTime()),
    })
    .groupBy(groupBy)
    .orderBy(`${orderBy}`, orderDirection)
    .getRawMany();
  return data;
}
