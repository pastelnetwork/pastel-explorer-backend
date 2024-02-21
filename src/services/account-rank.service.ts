import { dataSource } from '../datasource';
import { AccountRankEntity } from '../entity/account-rank';

class AccountRankService {
  private async getRepository() {
    const service = await dataSource;
    return service.getRepository(AccountRankEntity);
  }
  async getTopBalanceRank(): Promise<AccountRankEntity[]> {
    const service = await this.getRepository();
    return service.find({
      select: ['address', 'amount', 'percentage', 'rank'],
    });
  }
}

export default new AccountRankService();
