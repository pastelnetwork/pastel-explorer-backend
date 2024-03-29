import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { StatsEntity } from '../../entity/stats.entity';
import blockService from '../../services/block.service';
import { getCurrentHashrate } from '../../services/hashrate.service';
import marketDataService from '../../services/market-data.service';
import memPoolService from '../../services/mempoolinfo.service';
import statsService from '../../services/stats.service';
import transactionService from '../../services/transaction.service';
import { getDateErrorFormat, readTotalBurnedFile } from '../../utils/helpers';

export async function updateStats(
  connection: Connection,
  nonZeroAddresses: INonZeroAddresses[],
  totalSupply: number,
  blockHeight: number,
  blockTime: number,
  latestTotalBurnedPSL: number,
): Promise<boolean> {
  const lastDayBlocks = await blockService.getLastDayBlocks();
  const numberOfBlocks = lastDayBlocks.length;
  const transactionsCount = lastDayBlocks.reduce<number>(
    (acc, curr) => acc + curr.transactionCount,
    0,
  );
  const totalBlockSize = lastDayBlocks.reduce((total, block) => {
    return total + block.size;
  }, 0);
  const avgBlockSizeLast24Hour = numberOfBlocks
    ? totalBlockSize / numberOfBlocks
    : 0;

  const avgTransactionPerBlockLast24Hour = numberOfBlocks
    ? transactionsCount / numberOfBlocks
    : 0;

  const avgTransactionFeeLastTwoDays = (
    await transactionService.getAverageTransactionFee('1d')
  ).reverse();
  const avgTransactionFeeLast24Hour = avgTransactionFeeLastTwoDays[0]?.fee || 0;
  const latestMemPool = await memPoolService.getLatest();
  const memPoolSize = latestMemPool ? latestMemPool.usage / 1000 : 0;
  const avgTransactionsPerSecond = transactionsCount / (60 * 60 * 24);

  try {
    const [info] = await rpcClient.command<
      Array<{
        difficulty: string;
      }>
    >([
      {
        method: 'getinfo',
        parameters: [],
      },
    ]);
    const [txOutInfo] = await rpcClient.command<
      Array<{
        transactions: number;
        total_amount: string;
      }>
    >([
      {
        method: 'gettxoutsetinfo',
        parameters: [],
      },
    ]);
    const { marketCapInUSD, usdPrice, btcPrice } =
      await marketDataService.getMarketData('pastel');
    const currentHashrate = await getCurrentHashrate();
    const totalBurnedPSL = await readTotalBurnedFile();
    const stats: StatsEntity = {
      btcPrice: btcPrice,
      coinSupply: Number(totalSupply),
      difficulty: Number(info.difficulty),
      gigaHashPerSec: currentHashrate.toFixed(4),
      marketCapInUSD: marketCapInUSD,
      transactions: txOutInfo.transactions,
      usdPrice: usdPrice,
      timestamp: Date.now(),
      avgTransactionsPerSecond,
      nonZeroAddressesCount: nonZeroAddresses.length,
      avgBlockSizeLast24Hour,
      avgTransactionFeeLast24Hour,
      avgTransactionPerBlockLast24Hour,
      memPoolSize,
      totalBurnedPSL:
        totalBurnedPSL < latestTotalBurnedPSL
          ? latestTotalBurnedPSL
          : totalBurnedPSL,
      blockHeight,
      blockTime,
    };
    await connection.getRepository(StatsEntity).insert(stats);
  } catch (e) {
    console.error(`Update price error >>> ${getDateErrorFormat()} >>>`, e);
  }
  return true;
}

export async function updateCoinSupplyAndTotalBurnedData(
  connection: Connection,
  startBlock: number,
  endBlock: number,
): Promise<boolean> {
  try {
    let totalAmount = await transactionService.getTotalSupply();
    for (let i = endBlock; i >= 331324; i--) {
      const blockHeight = i;
      if (blockHeight > 0) {
        console.log(`Processing block ${blockHeight}`);
        let currentStatsData =
          await statsService.getDataByBlockHeight(blockHeight);
        if (!currentStatsData) {
          currentStatsData = await connection
            .getRepository(StatsEntity)
            .createQueryBuilder()
            .select('id, totalBurnedPSL')
            .where('blockHeight = 0')
            .orderBy('timestamp', 'DESC')
            .getRawOne();
        }
        let prevTotalAmount =
          await transactionService.getTotalSupplyByBlockHeight(blockHeight - 1);
        const currentTotalAmount =
          (await transactionService.getTotalSupplyByBlockHeight(blockHeight)) ||
          0;
        let coinSupply = totalAmount - prevTotalAmount;
        if (i === endBlock) {
          coinSupply = totalAmount;
          prevTotalAmount = 0;
        }
        totalAmount -= currentTotalAmount;
        let totalBurnedPSL = currentStatsData?.totalBurnedPSL || 0;
        if (!currentStatsData?.totalBurnedPSL) {
          if (i === endBlock) {
            totalBurnedPSL = await readTotalBurnedFile();
          } else {
            const prevStats = await statsService.getDataByBlockHeight(
              blockHeight - 1,
            );
            totalBurnedPSL = prevStats?.totalBurnedPSL || 0;
          }
        }
        if (currentStatsData?.blockHeight) {
          await connection
            .getRepository(StatsEntity)
            .createQueryBuilder()
            .update()
            .set({
              totalBurnedPSL,
              coinSupply,
            })
            .where('blockHeight = :blockHeight', { blockHeight })
            .execute();
        } else {
          await connection
            .getRepository(StatsEntity)
            .createQueryBuilder()
            .update()
            .set({
              totalBurnedPSL,
              coinSupply,
            })
            .where('id = :id', { id: currentStatsData.id })
            .execute();
        }
      } else {
        await connection
          .getRepository(StatsEntity)
          .createQueryBuilder()
          .delete()
          .where('blockHeight = 0')
          .execute();
        return true;
      }
    }
    return true;
  } catch (e) {
    console.error(
      `Update Coin Supply and Total Burned error >>> ${getDateErrorFormat()} >>>`,
      e,
    );
    return false;
  }
}
