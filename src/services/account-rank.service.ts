import { getRepository, Repository } from 'typeorm';

import { AccountRankEntity } from '../entity/account-rank';
import { AccountReceivedRankEntity } from '../entity/account-received-rank';

class AccountRankService {
  private getBalanceRankRepository(): Repository<AccountRankEntity> {
    return getRepository(AccountRankEntity);
  }
  private getReceivedRankRepository(): Repository<AccountRankEntity> {
    return getRepository(AccountReceivedRankEntity);
  }
  async getTopBalanceRank(): Promise<AccountRankEntity[]> {
    return this.getBalanceRankRepository().find({
      select: ['address', 'amount', 'percentage', 'rank'],
    });
  }
  async getTopReceivedRank(): Promise<AccountRankEntity[]> {
    return this.getReceivedRankRepository().find({
      select: ['address', 'amount', 'percentage', 'rank'],
    });
  }
}

export default new AccountRankService();
