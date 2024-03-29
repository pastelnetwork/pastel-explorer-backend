import { dataSource } from '../datasource';
import { HashrateEntity } from '../entity/hashrate.entity';
import { periodGroupByHourly } from '../utils/constants';
import { generatePrevTimestamp, getSqlTextByPeriod } from '../utils/helpers';
import { periodCallbackData, TPeriod } from '../utils/period';
import blockService from './block.service';

const blockPerMinute = 2.5;
const expectedBlocks = (60 * 24) / blockPerMinute;
const twoToPowerOfThirtyTwo = 2 ** 32;
const avarageBlockTime = 150;
const gigaMultiplier = 1e9;
const megaMultiplier = 1e6;

export const calculateHashrate = (
  blocksFound: number,
  difficulty: number,
  isMega = false,
): number => {
  const rate = isMega ? megaMultiplier : gigaMultiplier;
  return (
    ((blocksFound / expectedBlocks) * difficulty * twoToPowerOfThirtyTwo) /
    (avarageBlockTime * rate)
  );
};

export const getCurrentHashrate = async function (): Promise<number> {
  const from = (Date.now() - 24 * 60 * 60 * 1000) / 1000;

  const to: number = from + 24 * 60 * 60;

  const blocks = await blockService.findAllBetweenTimestamps(from, to);
  if (blocks.length > 0) {
    const latestBlock = blocks[blocks.length - 1];
    return calculateHashrate(
      latestBlock.blockCountLastDay,
      Number(latestBlock.difficulty),
    );
  }
  return 0;
};

class HashrateService {
  private async getRepository() {
    const service = await dataSource;
    return service.getRepository(HashrateEntity);
  }

  async getHashrate(
    period: TPeriod,
    startTime?: number,
  ): Promise<HashrateEntity[]> {
    const { whereSqlText, groupBy } = getSqlTextByPeriod({
      period,
      isMicroseconds: true,
      startTime,
      isTimestamp: true,
    });
    let networksolps5 = 'networksolps5';
    let networksolps10 = 'networksolps10';
    let networksolps25 = 'networksolps25';
    let networksolps50 = 'networksolps50';
    let networksolps100 = 'networksolps100';
    let networksolps500 = 'networksolps500';
    let networksolps1000 = 'networksolps1000';
    if (periodGroupByHourly.includes(period)) {
      networksolps5 = 'MAX(networksolps5)';
      networksolps10 = 'MAX(networksolps10)';
      networksolps25 = 'MAX(networksolps25)';
      networksolps50 = 'MAX(networksolps50)';
      networksolps100 = 'MAX(networksolps100)';
      networksolps500 = 'MAX(networksolps500)';
      networksolps1000 = 'MAX(networksolps1000)';
    }
    const service = await this.getRepository();
    let items: HashrateEntity[] = await service
      .createQueryBuilder()
      .select('timestamp')
      .addSelect(networksolps5, 'networksolps5')
      .addSelect(networksolps10, 'networksolps10')
      .addSelect(networksolps25, 'networksolps25')
      .addSelect(networksolps50, 'networksolps50')
      .addSelect(networksolps100, 'networksolps100')
      .addSelect(networksolps500, 'networksolps500')
      .addSelect(networksolps1000, 'networksolps1000')
      .where(whereSqlText)
      .groupBy(groupBy.replace('timestamp', 'timestamp/1000'))
      .orderBy('timestamp', 'ASC')
      .getRawMany();

    if (
      periodCallbackData.indexOf(period) !== -1 &&
      items.length === 0 &&
      !startTime
    ) {
      const lastItem = await service.find({
        order: { timestamp: 'DESC' },
        take: 1,
      });
      const target = generatePrevTimestamp(lastItem[0].timestamp, period);
      items = await service
        .createQueryBuilder()
        .select('timestamp')
        .addSelect(networksolps5, 'networksolps5')
        .addSelect(networksolps10, 'networksolps10')
        .addSelect(networksolps25, 'networksolps25')
        .addSelect(networksolps50, 'networksolps50')
        .addSelect(networksolps100, 'networksolps100')
        .addSelect(networksolps500, 'networksolps500')
        .addSelect(networksolps1000, 'networksolps1000')
        .where(`timestamp > ${target}`)
        .groupBy(groupBy.replace('timestamp', 'timestamp/1000'))
        .orderBy('timestamp', 'ASC')
        .getRawMany();
    }

    return items;
  }
}

export default new HashrateService();
