import dayjs from 'dayjs';
import { Between, getRepository, Repository } from 'typeorm';

import { HashrateEntity } from '../entity/hashrate.entity';
import { getSqlTextByPeriod } from '../utils/helpers';
import { TPeriod } from '../utils/period';
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
  private getRepository(): Repository<HashrateEntity> {
    return getRepository(HashrateEntity);
  }

  async getHashrate(period: TPeriod): Promise<HashrateEntity[]> {
    const { whereSqlText, groupBy } = getSqlTextByPeriod(period, true);

    let items: HashrateEntity[] = await this.getRepository()
      .createQueryBuilder()
      .select('timestamp')
      .addSelect('SUM(networksolps5)', 'networksolps5')
      .addSelect('SUM(networksolps10)', 'networksolps10')
      .addSelect('SUM(networksolps25)', 'networksolps25')
      .addSelect('SUM(networksolps50)', 'networksolps50')
      .addSelect('SUM(networksolps100)', 'networksolps100')
      .addSelect('SUM(networksolps500)', 'networksolps500')
      .addSelect('SUM(networksolps1000)', 'networksolps1000')
      .where(whereSqlText)
      .groupBy(groupBy.replace('timestamp', 'timestamp/1000'))
      .orderBy('timestamp', 'ASC')
      .getRawMany();

    if (period === '24h' && items.length === 0) {
      const lastItem = await this.getRepository().find({
        order: { timestamp: 'DESC' },
        take: 1,
      });
      const target = dayjs(lastItem[0].timestamp)
        .subtract(24, 'hour')
        .valueOf();
      items = await this.getRepository()
        .createQueryBuilder()
        .select('timestamp')
        .addSelect('SUM(networksolps5)', 'networksolps5')
        .addSelect('SUM(networksolps10)', 'networksolps10')
        .addSelect('SUM(networksolps25)', 'networksolps25')
        .addSelect('SUM(networksolps50)', 'networksolps50')
        .addSelect('SUM(networksolps100)', 'networksolps100')
        .addSelect('SUM(networksolps500)', 'networksolps500')
        .addSelect('SUM(networksolps1000)', 'networksolps1000')
        .where({
          timestamp: Between(target, lastItem[0].timestamp),
        })
        .groupBy(
          "strftime('%H %m/%d/%Y', datetime(timestamp / 1000, 'unixepoch'))",
        )
        .orderBy('timestamp', 'ASC')
        .getRawMany();
    }

    return items;
  }
}

export default new HashrateService();
