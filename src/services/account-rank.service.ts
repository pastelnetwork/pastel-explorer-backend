import { getRepository, Repository } from 'typeorm';

import { AccountRankEntity } from '../entity/account-rank';

class AccountRankService {
  private getRepository(): Repository<AccountRankEntity> {
    return getRepository(AccountRankEntity);
  }
  async getTopRank(): Promise<AccountRankEntity[]> {
    return this.getRepository().find();
  }
}

export default new AccountRankService();
