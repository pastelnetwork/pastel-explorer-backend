import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { StatsEntity } from '../../entity/stats.entity';
import addressEventsService from '../../services/address-events.service';
import blockService from '../../services/block.service';
import { getCurrentHashrate } from '../../services/hashrate.service';
import marketDataService from '../../services/market-data.service';
import memPoolService from '../../services/mempoolinfo.service';
import statsService from '../../services/stats.service';
import transactionService from '../../services/transaction.service';

const ONE_HOUR = 1 * 60 * 60;
export async function updateStats(connection: Connection): Promise<boolean> {
  const latestStats = await statsService.getLatest();
  if (latestStats && Date.now() - latestStats.timestamp < ONE_HOUR) {
    return false;
  }
  const nonZeroAddresses = await addressEventsService.findAllNonZeroAddresses();
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
    const totalSupply = await transactionService.getTotalSupply();
    const currentHashrate = await getCurrentHashrate();

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
    };
    await connection.getRepository(StatsEntity).insert(stats);
  } catch (e) {
    console.error('Update price error >>>', e);
  }
  return true;
}
