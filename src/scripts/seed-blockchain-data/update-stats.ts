import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { StatsEntity } from '../../entity/stats.entity';
import blockService from '../../services/block.service';
import { getCurrentHashrate } from '../../services/hashrate.service';
import marketDataService from '../../services/market-data.service';
import memPoolService from '../../services/mempoolinfo.service';
import transactionService from '../../services/transaction.service';
import { getDateErrorFormat, readTotalBurnedFile } from '../../utils/helpers';

export async function updateStats(
  connection: Connection,
  nonZeroAddresses: INonZeroAddresses[],
  totalSupply: number,
  blockHeight: number,
  blockTime: number,
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
  const getInfoPromise = rpcClient.command<
    Array<{
      difficulty: string;
    }>
  >([
    {
      method: 'getinfo',
      parameters: [],
    },
  ]);
  const getTransactionsOutInfoPromise = rpcClient.command<
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
  try {
    const [[info], [txOutInfo]] = await Promise.all([
      getInfoPromise,
      getTransactionsOutInfoPromise,
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
      totalBurnedPSL,
      blockHeight,
      blockTime,
    };
    await connection.getRepository(StatsEntity).insert(stats);
  } catch (e) {
    console.error(`Update price error >>> ${getDateErrorFormat()} >>>`, e);
  }
  return true;
}
