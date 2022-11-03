import dayjs from 'dayjs';
import { Between, getRepository, Repository } from 'typeorm';

import { HashrateEntity } from '../entity/hashrate.entity';
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
  private getRepository(): Repository<HashrateEntity> {
    return getRepository(HashrateEntity);
  }

  async getHashrate(period: TPeriod): Promise<HashrateEntity[]> {
    const { whereSqlText, groupBy } = getSqlTextByPeriod(period, true);

    let items: HashrateEntity[] = await this.getRepository()
      .createQueryBuilder()
      .select('*')
      .where(whereSqlText)
      .groupBy(groupBy.replace('timestamp', 'timestamp/1000'))
      .orderBy('timestamp', 'ASC')
      .getRawMany();

    if (periodCallbackData.indexOf(period) !== -1 && items.length === 0) {
      const lastItem = await this.getRepository().find({
        order: { timestamp: 'DESC' },
        take: 1,
      });
      const target = generatePrevTimestamp(lastItem[0].timestamp, period);
      items = await this.getRepository()
        .createQueryBuilder()
        .select('*')
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
