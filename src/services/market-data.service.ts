import axios from 'axios';
import coingecko from 'coingecko-api';
import redis from 'redis';
import { promisify } from 'util';

import { axiosInstance } from './axiosInstance';

const coinGeckoClient = new coingecko();
const client = redis.createClient({ url: process.env.REDIS_URL });
const getAsync = promisify(client.get).bind(client);

class MarketDataService implements IMarketService {
  private getUrl(coinName: string): string {
    return `https://api.coingecko.com/api/v3/coins/${coinName}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
  }
  async getUSDPrice(): Promise<number | null> {
    const resp = await coinGeckoClient.simple.price({
      ids: ['pastel'],
      vs_currencies: ['usd'],
    });

    if (!resp.data?.['pastel']?.['usd']) {
      throw new Error('pastelPrice fetchPastelPrice error: invalid response');
    }
    return resp.data['pastel']?.['usd'];
  }

  async getMarketData(coinName: string): Promise<MarketData> {
    try {
      const { data } = await axios.get<MarketApiData>(this.getUrl(coinName));
      if (data?.market_data?.current_price?.btc) {
        await client.set(
          'coingecko',
          JSON.stringify({
            btcPrice: data.market_data.current_price.btc,
            usdPrice: data.market_data.current_price.usd,
            marketCapInUSD: data.market_data.market_cap.usd,
          }),
        );
      }

      return {
        btcPrice: data.market_data.current_price.btc,
        usdPrice: data.market_data.current_price.usd,
        marketCapInUSD: data.market_data.market_cap.usd,
      };
    } catch {
      const coingecko = await getAsync('coingecko');
      if (coingecko) {
        const data = JSON.parse(coingecko);
        return {
          btcPrice: data.btcPrice,
          usdPrice: data.usdPrice,
          marketCapInUSD: parseInt(data.marketCapInUSD),
        };
      }
    }
  }

  async getCoins(
    url: string,
    params: MartketParams,
  ): Promise<MarketCoinRespone> {
    const { data } = await axiosInstance.get<MarketCoinRespone>(
      `/coins/pastel/${url}`,
      {
        params,
      },
    );
    return data;
  }
}

export default new MarketDataService();
