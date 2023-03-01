import { getRepository, Repository } from 'typeorm';

import { AccountRankEntity } from '../entity/account-rank';

class AccountRankService {
  private getBalanceRankRepository(): Repository<AccountRankEntity> {
    return getRepository(AccountRankEntity);
  }
  async getTopBalanceRank(): Promise<AccountRankEntity[]> {
    return this.getBalanceRankRepository().find({
      select: ['address', 'amount', 'percentage', 'rank'],
    });
  }
}

export default new AccountRankService();
