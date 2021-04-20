import { Connection } from 'typeorm';

import { AccountRankEntity } from '../../entity/account-rank';
import addressEventsService from '../../services/address-events.service';

export async function createTopRank(connection: Connection): Promise<void> {
  const { rank, totalSum } = await addressEventsService.getTopRank();

  const batchAccountRank = rank.map<Omit<AccountRankEntity, 'id'>>(
    (v, idx) => ({
      rank: idx + 1,
      address: v.account,
      percentage: (v.sum / totalSum) * 100,
      amount: v.sum,
    }),
  );
  await connection.transaction(async entityManager => {
    await entityManager.getRepository(AccountRankEntity).clear();
    await entityManager
      .getRepository(AccountRankEntity)
      .insert(batchAccountRank);
  });
}
