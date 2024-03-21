import marketDataService from '../../services/market-data.service';
import { delay, getDateErrorFormat } from '../../utils/helpers';

let isUpdating = false;

export async function updateHistoricalMarket(): Promise<boolean> {
  try {
    if (isUpdating) {
      return;
    }
    isUpdating = true;
    const period1dData = await marketDataService.getCoins('market_chart', {
      vs_currency: 'usd',
      days: 1,
    });
    const period7dData = await marketDataService.getCoins('market_chart', {
      vs_currency: 'usd',
      days: 7,
    });
    await delay(30000);
    const period14dData = await marketDataService.getCoins('market_chart', {
      vs_currency: 'usd',
      days: 14,
    });
    const period30dData = await marketDataService.getCoins('market_chart', {
      vs_currency: 'usd',
      days: 30,
    });
    await delay(30000);
    const period90dData = await marketDataService.getCoins('market_chart', {
      vs_currency: 'usd',
      days: 90,
    });
    const period180dData = await marketDataService.getCoins('market_chart', {
      vs_currency: 'usd',
      days: 180,
    });
    await delay(30000);
    const period1yData = await marketDataService.getCoins('market_chart', {
      vs_currency: 'usd',
      days: 365,
    });
    const periodMaxData = await marketDataService.getCoins('market_chart', {
      vs_currency: 'usd',
      days: 'max',
    });
    await marketDataService.deleteOldestRecord();
    await marketDataService.saveHistoricalMarket({
      id: undefined,
      period1d: JSON.stringify(period1dData),
      period7d: JSON.stringify(period7dData),
      period14d: JSON.stringify(period14dData),
      period30d: JSON.stringify(period30dData),
      period90d: JSON.stringify(period90dData),
      period180d: JSON.stringify(period180dData),
      period1y: JSON.stringify(period1yData),
      periodmax: JSON.stringify(periodMaxData),
      createdAt: Date.now(),
    });
    isUpdating = false;
    return true;
  } catch (error) {
    isUpdating = false;
    console.error(
      `Updated Historical Market error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );
    return false;
  }
}
