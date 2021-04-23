import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { StatsEntity } from '../../entity/stats.entity';
import marketDataService from '../../services/market-data.service';
import statsService from '../../services/stats.service';

const ONE_HOUR = 1000 * 60 * 60;
export async function updateStats(connection: Connection): Promise<void> {
  const latestStats = await statsService.getLatest();
  if (latestStats && Date.now() - latestStats.timestamp < ONE_HOUR) {
    return;
  }
  const getInfoPromise = rpcClient.command<Array<{ difficulty: string; }>>([
    {
      method: 'getinfo',
      parameters: [],
    },
  ]);
  const getTransactionsOutInfoPromise = rpcClient.command<
    Array<{ transactions: number; total_amount: string; }>
  >([
    {
      method: 'gettxoutsetinfo',
      parameters: [],
    },
  ]);
  const getMiningInfoPromise = rpcClient.command<
    Array<{ networkhashps: number; }>
  >([
    {
      method: 'getmininginfo',
      parameters: [],
    },
  ]);
  const [[info], [txOutInfo], [miningInfo]] = await Promise.all([
    getInfoPromise,
    getTransactionsOutInfoPromise,
    getMiningInfoPromise,
  ]);
  const {
    marketCapInUSD,
    usdPrice,
    btcPrice,
  } = await marketDataService.getMarketData('pastel');
  const stats: StatsEntity = {
    btcPrice: btcPrice,
    coinSupply: Number(txOutInfo.total_amount),
    difficulty: Number(info.difficulty),
    gigaHashPerSec: (miningInfo.networkhashps / 1000).toFixed(4),
    marketCapInUSD: marketCapInUSD,
    transactions: txOutInfo.transactions,
    usdPrice: usdPrice,
    timestamp: Date.now(),
  };
  await connection.getRepository(StatsEntity).insert(stats);
}
