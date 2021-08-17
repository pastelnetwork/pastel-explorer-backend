declare type MartketParams = {
  vs_currency: 'usd';
  days: number | 'max';
  interval?: 'hourly' | 'daily';
};

declare type MarketChartItem = [number, number];

declare type MarketCoinRespone = {
  prices: MarketChartItem[];
  market_caps: MarketChartItem[];
  total_volumes: MarketChartItem[];
};

declare abstract class IMarketService {
  abstract getUSDPrice: () => Promise<number | null>;

  abstract getMarketData: (coinName: string) => Promise<MarketData>;

  abstract getCoins: (
    url: string,
    params: MartketParams,
  ) => Promise<MarketCoinRespone>;
}
