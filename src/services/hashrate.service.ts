import { getRepository, Repository } from 'typeorm';

import { HashrateEntity } from '../entity/hashrate.entity';
import { getStartPoint, TPeriod } from '../utils/period';
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

  async getHashrate(
    offset: number,
    limit: number,
    orderBy: keyof HashrateEntity,
    orderDirection: 'DESC' | 'ASC',
    period: TPeriod,
  ): Promise<HashrateEntity[]> {
    let whereSqlText = ' ';
    if (period !== 'all') {
      const time_stamp = getStartPoint(period);
      whereSqlText = `timestamp >= ${time_stamp} `;
    }
    const data = await this.getRepository()
      .createQueryBuilder()
      .select('*')
      .where(whereSqlText)
      .orderBy('timestamp', orderDirection)
      .getRawMany();

    return data;
  }
}

export default new HashrateService();
