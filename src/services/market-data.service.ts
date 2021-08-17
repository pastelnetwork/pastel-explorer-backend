import axios from 'axios';
import coingecko from 'coingecko-api';

import { axiosInstance } from './axiosInstance';

const coinGeckoClient = new coingecko();

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
    const { data } = await axios.get<MarketApiData>(this.getUrl(coinName));
    // const resp = await coinGeckoClient.simple.price({
    //   ids: ['pastel'],
    //   vs_currencies: ['usd', 'btc'],

    // });
    // console.log({ resp: JSON.stringify(data) });
    return {
      btcPrice: data.market_data.current_price.btc,
      usdPrice: data.market_data.current_price.usd,
      marketCapInUSD: data.market_data.market_cap.usd,
    };
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
