import { dataSource } from '../datasource';
import { SupernodeFeeScheduleEntity } from '../entity/supernode-feeschedule';
import { getStartDateByPeriod, TPeriod } from '../utils/period';

class SupernodeFeeScheduleService {
  private async getRepository() {
    const service = await dataSource;
    return service.getRepository(SupernodeFeeScheduleEntity);
  }

  async getIdByBlockHeight(blockHeight: number) {
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .select('id')
      .where('blockHeight = :blockHeight', { blockHeight })
      .getRawOne();
  }

  async getDataForChart(period: TPeriod) {
    const startDate = getStartDateByPeriod(period);
    let groupBy =
      "strftime('%H %m/%d/%Y', datetime(blockTime / 1000, 'unixepoch'))";
    if (['max', '1y', '180d'].includes(period)) {
      groupBy = "strftime('%m/%d/%Y', datetime(blockTime / 1000, 'unixepoch'))";
    }
    const service = await this.getRepository();
    return await service
      .createQueryBuilder()
      .select('MAX(blockTime) as time, AVG(feeDeflatorFactor) as value')
      .where('blockTime >= :startDate', { startDate })
      .groupBy(groupBy)
      .orderBy('blockTime', 'ASC')
      .getRawMany();
  }

  async getLatest() {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .select(
        'feeDeflatorFactor, pastelIdRegistrationFee, usernameRegistrationFee, usernameChangeFee, blockHeight, rawData',
      )
      .where("rawData != ''")
      .orderBy('blockHeight', 'DESC')
      .getRawOne();
  }

  async getDataForUpdate() {
    const service = await this.getRepository();
    return service
      .createQueryBuilder('s')
      .select('s.id, blockHeight, blockHash, blockTime')
      .where('pastelIdRegistrationFee = 0')
      .orderBy('blockHeight', 'ASC')
      .getRawMany();
  }

  async getAllDataWithRawDataNotNull(limit = 10) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder('s')
      .select('s.id, blockHeight, rawData')
      .where("rawData != ''")
      .orderBy('blockHeight', 'ASC')
      .limit(limit)
      .getRawMany();
  }

  async updateRawData(entity) {
    const service = await this.getRepository();
    return service
      .createQueryBuilder()
      .update()
      .set({ rawData: entity.rawData })
      .where('blockHeight = :blockHeight', { blockHeight: entity.blockHeight })
      .execute();
  }
}

export default new SupernodeFeeScheduleService();
