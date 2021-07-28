import { Between, FindManyOptions, Repository } from 'typeorm';

// import { NettotalsEntity } from '../entity/nettotals.entity';
import { IGetLimitParams } from '../types/query-request';
import { getStartPoint } from '../utils/period';

// type TRepository = NettotalsEntity;

export async function getLimitQuery<T>({
  orderBy,
  orderDirection,
  period,
  offset,
  limit,
  repository,
  isMicroseconds = true,
}: IGetLimitParams<T> & { repository: Repository<T>; }): Promise<T[]> {
  const query: FindManyOptions = {
    // skip: offset,
    // take: limit,
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
    .getRawMany();
  return data;
  // const count = await repository.count(query);
  // const take = 500;
  // const skip = Math.round(count / take);
  // let data = [];
  // get statistics data limit 500 for chart
  // if (count <= take || skip < 2) {
  //   const statsInfo = await repository.find(query);
  //   return statsInfo;
  // } else {
  //   let index = 0;
  //   for (let i = 0; i <= count; i += skip) {
  //     const item = await repository.find({
  //       take: 1,
  //       skip: skip * index,
  //     });
  //     index += 1;
  //     if (item && item.length) {
  //       data = data.concat(item);
  //     }
  //   }
  //   return data;
  // }
}
