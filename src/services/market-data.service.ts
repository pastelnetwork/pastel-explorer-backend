import axios from 'axios';
import coingecko from 'coingecko-api';
import { createClient } from 'redis';
import { getRepository, Repository } from 'typeorm';
import { promisify } from 'util';

import { HistoricalMarketEntity } from '../entity/historical-market';
import { axiosInstance } from './axiosInstance';

const coinGeckoClient = new coingecko();
const client = createClient({ url: process.env.REDIS_URL });
const getAsync = promisify(client.get).bind(client);

class MarketDataService implements IMarketService {
  private getRepository(): Repository<HistoricalMarketEntity> {
    return getRepository(HistoricalMarketEntity);
  }

  async saveHistoricalMarket(data: HistoricalMarketEntity) {
    return this.getRepository().save(data);
  }

  async deleteOldestRecord() {
    const result = await this.getRepository()
      .createQueryBuilder()
      .select('COUNT(1)', 'total')
      .getRawOne();
    if (result.total > 3) {
      return this.getRepository().query(
        'DELETE FROM HistoricalMarketEntity WHERE id IN (SELECT id FROM HistoricalMarketEntity ORDER BY createdAt LIMIT 1)',
      );
    }
    return false;
  }

  async getMarketPriceByPeriod(field: string) {
    const item = await this.getRepository()
      .createQueryBuilder()
      .select(field, 'data')
      .addSelect('createdAt')
      .orderBy('createdAt', 'DESC')
      .limit(1)
      .getRawOne();
    let results = null;
    if (item) {
      results = JSON.parse(item.data);
    }

    return results;
  }

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

  async getCryptoCompare() {
    try {
      const { data } = await axios.get<CryptoCompareApiData>(
        `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=PSL&tsyms=USD,BTC&api_key=${process.env.CRYPTOCOMPARE_KEY}`,
      );
      return {
        btcPrice: data.RAW.PSL.BTC.PRICE,
        usdPrice: Number(data.RAW.PSL.USD.PRICE.toFixed(8)),
        marketCapInUSD: Number(
          data.RAW.PSL.USD.CIRCULATINGSUPPLYMKTCAP.toFixed(0),
        ),
      };
    } catch (error) {
      console.log(error);
      throw new Error(error.message);
    }
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
      try {
        const { btcPrice, usdPrice, marketCapInUSD } =
          await this.getCryptoCompare();
        return {
          btcPrice,
          usdPrice,
          marketCapInUSD,
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
