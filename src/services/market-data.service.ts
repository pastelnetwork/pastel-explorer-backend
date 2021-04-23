import axios from 'axios';

class MarketDataService {
  private getUrl(coinName: string): string {
    return `https://api.coingecko.com/api/v3/coins/${coinName}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
  }
  async getMarketData(coinName: string): Promise<MarketData> {
    const { data } = await axios.get<MarketApiData>(this.getUrl(coinName));
    return {
      btcPrice: data.market_data.current_price.btc,
      usdPrice: data.market_data.current_price.usd,
      marketCapInUSD: data.market_data.market_cap.usd,
    };
  }
}

export default new MarketDataService();
