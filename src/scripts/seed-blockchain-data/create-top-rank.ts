import { Connection } from 'typeorm';

import { AccountRankEntity } from '../../entity/account-rank';
import { AccountReceivedRankEntity } from '../../entity/account-received-rank';
import addressEventsService from '../../services/address-events.service';

export async function createTopBalanceRank(
  connection: Connection,
): Promise<void> {
  const { rank, totalSum } = await addressEventsService.getTopBalanceRank(250);

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

export async function createTopReceivedRank(
  connection: Connection,
): Promise<void> {
  const { rank, totalSum } = await addressEventsService.getTopReceivedRank();

  const batchAccountRank = rank.map<Omit<AccountReceivedRankEntity, 'id'>>(
    (v, idx) => ({
      rank: idx + 1,
      address: v.account,
      percentage: (v.sum / totalSum) * 100,
      amount: v.sum,
    }),
  );
  await connection.transaction(async entityManager => {
    await entityManager.getRepository(AccountReceivedRankEntity).clear();
    await entityManager
      .getRepository(AccountReceivedRankEntity)
      .insert(batchAccountRank);
  });
}
