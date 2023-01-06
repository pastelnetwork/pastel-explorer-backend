import { Connection } from 'typeorm';

import { AccountRankEntity } from '../../entity/account-rank';
import addressEventsService from '../../services/address-events.service';
import { getDateErrorFormat } from '../../utils/helpers';

export async function createTopBalanceRank(
  connection: Connection,
): Promise<void> {
  try {
    const { rank, totalSum } = await addressEventsService.getTopBalanceRank(
      250,
    );

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
  } catch (e) {
    console.error(
      `Error createTopBalanceRank >>> ${getDateErrorFormat()} >>>`,
      e,
    );
  }
}
