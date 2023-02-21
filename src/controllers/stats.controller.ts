import dayjs from 'dayjs';
import express, { Request } from 'express';

import { MiningInfoEntity } from '../entity/mininginfo.entity';
import blockService from '../services/block.service';
import hashrateService from '../services/hashrate.service';
import marketDataService from '../services/market-data.service';
import masternodeService from '../services/masternode.service';
import mempoolinfoService from '../services/mempoolinfo.service';
import nettotalsServices from '../services/nettotals.services';
import senseRequestsService from '../services/senserequests.service';
import statsMiningService from '../services/stats.mining.service';
import statsService, {
  getCoinCirculatingSupply,
  getPercentPSLStaked,
} from '../services/stats.service';
import ticketService from '../services/ticket.service';
import transactionService from '../services/transaction.service';
import { IQueryParameters } from '../types/query-request';
import {
  sortByAccountFields,
  sortByBlocksFields,
  sortByMempoolFields,
  sortByMiningFields,
  sortByNettotalsFields,
  sortByStatsFields,
  sortByTotalSupplyFields,
  sortHashrateFields,
} from '../utils/constants';
import { getStartDate, getTheNumberOfTotalSupernodes } from '../utils/helpers';
import { marketPeriodData, periodCallbackData } from '../utils/period';
import {
  queryPeriodGranularitySchema,
  queryPeriodSchema,
  queryWithSortSchema,
  validateMarketChartsSchema,
} from '../utils/validator';

export const statsController = express.Router();

statsController.get('/', async (req, res) => {
  try {
    const [currentStats, lastDayStats, chartStats] = await Promise.all([
      statsService.getLatest(),
      statsService.getDayAgo(),
      statsService.getSummaryChartData(),
    ]);
    return res.send({
      currentStats,
      lastDayStats,
      chartStats,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

statsController.get('/list', async (req, res) => {
  try {
    const { offset, limit, sortDirection, sortBy, period } =
      queryWithSortSchema(sortByStatsFields).validateSync(req.query);
    const { useSort } = req.query;
    const startTime = Number(req.query?.timestamp?.toString() || '');
    let blocks = await statsService.getAll(
      offset,
      limit,
      sortBy || 'timestamp',
      !useSort ? 'ASC' : sortDirection || 'DESC',
      period,
      startTime,
    );
    if (
      periodCallbackData.indexOf(period) !== -1 &&
      blocks.length === 0 &&
      !startTime
    ) {
      blocks = await statsService.getLastData(period);
    }
    return res.send({
      data: blocks.sort((a, b) => a.timestamp - b.timestamp),
    });
  } catch (error) {
    return res.status(400).send({ error: error.message || error });
  }
});

statsController.get('/historical-statistics', async (req, res) => {
  try {
    const { offset, limit, sortDirection, sortBy, period, fields } =
      queryWithSortSchema(sortByStatsFields).validateSync(req.query);
    const { useSort } = req.query;
    const startTime = Number(req.query?.timestamp?.toString() || '');
    let blocks = await statsService.getAllForHistoricalStatistics(
      offset,
      limit,
      sortBy || 'timestamp',
      !useSort ? 'ASC' : sortDirection || 'DESC',
      fields || '*',
      period,
      startTime,
    );
    if (
      periodCallbackData.indexOf(period) !== -1 &&
      blocks.length === 0 &&
      !startTime
    ) {
      blocks = await statsService.getLastData(period);
    }
    return res.send({
      data: blocks.sort((a, b) => a.timestamp - b.timestamp),
    });
  } catch (error) {
    return res.status(400).send({ error: error.message || error });
  }
});

statsController.get('/mining-list', async (req, res) => {
  try {
    const { offset, limit, sortDirection, sortBy, period } =
      queryWithSortSchema(sortByMiningFields).validateSync(req.query);
    const blocks = await statsMiningService.getAll(
      offset,
      limit,
      sortBy || 'timestamp',
      sortDirection || 'DESC',
      period,
    );

    return res.send({
      data: blocks,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message || error });
  }
});

statsController.get('/mempool-info-list', async (req, res) => {
  try {
    const { offset, limit, sortDirection, sortBy, period } =
      queryWithSortSchema(sortByMempoolFields).validateSync(req.query);
    const { useSort } = req.query;
    let blocks = await mempoolinfoService.getAllForHistoricalStatistics(
      offset,
      limit,
      sortBy || 'timestamp',
      !useSort ? 'ASC' : sortDirection || 'DESC',
      period,
    );
    if (periodCallbackData.indexOf(period) !== -1 && !blocks.length) {
      blocks = await mempoolinfoService.getLastData(period);
    }
    return res.send({
      data: blocks,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message || error });
  }
});

statsController.get('/nettotals-list', async (req, res) => {
  try {
    const { offset, limit, sortDirection, sortBy, period } =
      queryWithSortSchema(sortByNettotalsFields).validateSync(req.query);
    const { useSort } = req.query;
    const startTime = Number(req.query?.timestamp?.toString() || '');
    let blocks = await nettotalsServices.getAll(
      offset,
      limit,
      sortBy || 'timestamp',
      !useSort ? 'ASC' : sortDirection || 'DESC',
      period,
      Number(req.query?.timestamp?.toString() || ''),
    );
    if (
      periodCallbackData.indexOf(period) !== -1 &&
      !blocks.length &&
      !startTime
    ) {
      blocks = await nettotalsServices.getLastData(period);
    }
    return res.send({
      data: blocks,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message || error });
  }
});

statsController.get('/blocks-list', async (req, res) => {
  try {
    const { offset, limit, sortDirection, sortBy, period } =
      queryWithSortSchema(sortByBlocksFields).validateSync(req.query);
    const { useSort } = req.query;
    let blocks = await blockService.getStatisticsBlocks(
      offset,
      limit,
      sortBy || 'timestamp',
      !useSort ? 'ASC' : sortDirection || 'DESC',
      period,
      Number(req.query?.timestamp?.toString() || ''),
    );
    if (!blocks.length) {
      blocks = await blockService.getLastData(
        '',
        period,
        '',
        '',
        '',
        true,
        'timestamp, height, transactionCount',
      );
    }
    return res.send({
      data: blocks,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message || error });
  }
});

statsController.get('/average-block-size', async (req, res) => {
  try {
    const { period, granularity } = queryPeriodGranularitySchema.validateSync(
      req.query,
    );
    const data = await blockService.getAverageBlockSizeStatistics(
      period,
      granularity,
      'ASC',
      req.query?.format?.toString(),
      Number(req.query?.timestamp?.toString() || ''),
    );
    res.send({ data });
  } catch (error) {
    return res.status(400).send({ error: error.message || error });
  }
});

statsController.get('/transaction-per-second', async (req, res) => {
  try {
    const { period } = queryPeriodSchema.validateSync(req.query);
    const data = await transactionService.getTransactionPerSecond(
      period,
      'ASC',
      Number(req.query?.timestamp?.toString() || ''),
    );
    res.send({ data });
  } catch (error) {
    return res.status(400).send({ error: error.message || error });
  }
});

statsController.get(
  '/mining-charts',
  async (
    req: Request<unknown, unknown, unknown, IQueryParameters<MiningInfoEntity>>,
    res,
  ) => {
    try {
      const { period } = queryWithSortSchema(sortHashrateFields).validateSync(
        req.query,
      );
      const data = await hashrateService.getHashrate(
        period,
        Number(req.query?.timestamp?.toString() || ''),
      );
      return res.send({
        data,
      });
    } catch (e) {
      if (typeof e.message === 'string') {
        return res.status(400).send({ error: e.message });
      }
      return res.status(500).send('Internal Error.');
    }
  },
);

statsController.get('/market/chart', async (req, res) => {
  try {
    const { period, chart } = validateMarketChartsSchema.validateSync(
      req.query,
    );
    const data = await marketDataService.getCoins('market_chart', {
      vs_currency: 'usd',
      days:
        getStartDate(Number(req.query?.timestamp?.toString() || '')) ||
        marketPeriodData[period],
    });
    if (chart === 'price') {
      res.send({
        data: { prices: data.prices, total_volumes: data.total_volumes },
      });
      return;
    }
    res.send({ data: { prices: data.prices, market_caps: data.market_caps } });
  } catch (error) {
    res.status(400).send({ error: error.message || error });
  }
});

statsController.get('/accounts', async (req, res) => {
  try {
    const { offset, limit, sortDirection, sortBy, period, fields } =
      queryWithSortSchema(sortByAccountFields).validateSync(req.query);
    const startTime = Number(req.query?.timestamp?.toString() || '');
    let data = await statsService.getAllForHistoricalStatistics(
      offset,
      limit,
      sortBy || 'timestamp',
      sortDirection || 'DESC',
      fields || '*',
      period,
      startTime,
    );
    if (!data.length && !startTime) {
      data = await statsService.getLastData(period);
    }
    res.send({ data });
  } catch (error) {
    res.status(400).send({ error: error.message || error });
  }
});

statsController.get('/circulating-supply', async (req, res) => {
  try {
    const { offset, limit, sortDirection, sortBy, period } =
      queryWithSortSchema(sortByTotalSupplyFields).validateSync(req.query);
    const startTime = Number(req.query?.timestamp?.toString() || '');
    const items = await statsService.getAll(
      offset,
      limit,
      sortBy || 'timestamp',
      sortDirection || 'DESC',
      period,
      startTime,
    );
    const data = [];
    const pslStaked =
      (await masternodeService.countFindAll()) *
      getTheNumberOfTotalSupernodes();
    for (let i = 0; i < items.length; i++) {
      const val = getCoinCirculatingSupply(
        pslStaked,
        items[i].coinSupply - items[i].totalBurnedPSL,
      );
      data.push({
        time: items[i].timestamp,
        value: val < 0 ? 0 : val,
      });
    }
    res.send({ data });
  } catch (error) {
    res.status(400).send({ error: error.message || error });
  }
});

statsController.get('/percent-of-psl-staked', async (req, res) => {
  try {
    const { period } = queryWithSortSchema(
      sortByTotalSupplyFields,
    ).validateSync(req.query);
    const data = [];
    const startTime = Number(req.query?.timestamp?.toString() || '');
    let dateLimit = marketPeriodData[period];
    const currentDate = dayjs();
    if (dateLimit === 'max') {
      const timestamp = await statsService.getStartDate();
      const startDate = dayjs(timestamp);
      dateLimit = currentDate.diff(startDate, 'day');
    }
    if (startTime > 0) {
      const startDate = dayjs(startTime);
      dateLimit = currentDate.diff(startDate, 'day');
    }
    if (period === '24h') {
      dateLimit = dateLimit * 24;
    }
    for (let i = 0; i <= dateLimit; i++) {
      const date = dayjs().subtract(i, period === '24h' ? 'hour' : 'day');
      const total =
        (await masternodeService.countFindByData(date.valueOf() / 1000)) || 1;
      const coinSupply = await statsService.getCoinSupplyByDate(date.valueOf());
      const val = getPercentPSLStaked(
        total * getTheNumberOfTotalSupernodes(),
        coinSupply,
      );
      data.push({
        time: date.valueOf(),
        value: val < 0 ? 0 : val,
      });
    }

    res.send({ data: data.sort((a, b) => a.time - b.time) });
  } catch (error) {
    res.status(400).send({ error: error.message || error });
  }
});

statsController.get('/current-stats', async (req, res) => {
  try {
    const serverName = process.env.EXPLORER_SERVER as string;
    const currentStats = await statsService.getCurrentStats();
    if (serverName !== 'Production') {
      currentStats.usdPrice = 0;
    }
    return res.send(currentStats);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

statsController.get('/average-rareness-score-on-sense', async (req, res) => {
  try {
    const { period } = queryWithSortSchema(
      sortByTotalSupplyFields,
    ).validateSync(req.query);
    const data = await senseRequestsService.getAverageRarenessScoreForChart(
      period,
    );
    const item = await senseRequestsService.countTotalRarenessScore(period);
    const difference = await senseRequestsService.getDifferenceRarenessScore(
      period,
    );
    return res.send({ data, difference, currentValue: item?.total || 0 });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

statsController.get('/sense-requests', async (req, res) => {
  try {
    const { period } = queryWithSortSchema(
      sortByTotalSupplyFields,
    ).validateSync(req.query);
    const data = await ticketService.getSenseOrCascadeRequest(period, 'sense');
    const item = await ticketService.countTotalSenseOrCascadeRequest(
      period,
      'sense',
    );
    const difference = await ticketService.getDifferenceSenseOrCascade(
      period,
      'sense',
    );
    return res.send({ data, difference, currentValue: item?.total || 0 });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

statsController.get('/total-fingerprints-on-sense', async (req, res) => {
  try {
    const time = [
      '08/08/2022 12:00:00 AM',
      '08/09/2022 12:00:00 AM',
      '08/10/2022 12:00:00 AM',
      '08/11/2022 12:00:00 AM',
      '08/12/2022 12:00:00 AM',
      '08/13/2022 12:00:00 AM',
      '08/14/2022 12:00:00 AM',
      '08/15/2022 12:00:00 AM',
      '08/16/2022 12:00:00 AM',
      '08/23/2022 12:00:00 AM',
      '08/24/2022 12:00:00 AM',
      '08/25/2022 12:00:00 AM',
      '08/26/2022 12:00:00 AM',
      '08/27/2022 12:00:00 AM',
      '08/28/2022 3:00:00 AM',
      '08/28/2022 4:00:00 AM',
      '08/28/2022 6:00:00 AM',
      '08/28/2022 12:00:00 AM',
      '08/29/2022 12:00:00 AM',
      '08/30/2022 12:00:00 AM',
      '08/31/2022 12:00:00 AM',
      '09/01/2022 12:00:00 AM',
      '09/02/2022 12:00:00 AM',
      '09/03/2022 12:00:00 AM',
      '09/04/2022 12:00:00 AM',
      '09/05/2022 12:00:00 AM',
      '09/06/2022 7:00:00 AM',
      '09/06/2022 8:00:00 AM',
      '09/06/2022 11:00:00 AM',
      '09/06/2022 12:00:00 AM',
    ];
    const result = [];
    for (let i = 0; i < time.length; i++) {
      result.push({
        timestamp: dayjs(time[i]).valueOf(),
        value: Math.floor(Math.random() * 9000) + 3000,
      });
    }
    const currentValue = Math.floor(Math.random() * 100000) + 20000;
    return res.send({ data: result, difference: 0.5, currentValue });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

statsController.get(
  '/average-size-of-nft-stored-on-cascade',
  async (req, res) => {
    try {
      const time = [
        '08/08/2022 12:00:00 AM',
        '08/09/2022 12:00:00 AM',
        '08/10/2022 12:00:00 AM',
        '08/11/2022 12:00:00 AM',
        '08/12/2022 12:00:00 AM',
        '08/13/2022 12:00:00 AM',
        '08/14/2022 12:00:00 AM',
        '08/15/2022 12:00:00 AM',
        '08/16/2022 12:00:00 AM',
        '08/23/2022 12:00:00 AM',
        '08/24/2022 12:00:00 AM',
        '08/25/2022 12:00:00 AM',
        '08/26/2022 12:00:00 AM',
        '08/27/2022 12:00:00 AM',
        '08/28/2022 3:00:00 AM',
        '08/28/2022 4:00:00 AM',
        '08/28/2022 6:00:00 AM',
        '08/28/2022 12:00:00 AM',
        '08/29/2022 12:00:00 AM',
        '08/30/2022 12:00:00 AM',
        '08/31/2022 12:00:00 AM',
        '09/01/2022 12:00:00 AM',
        '09/02/2022 12:00:00 AM',
        '09/03/2022 12:00:00 AM',
        '09/04/2022 12:00:00 AM',
        '09/05/2022 12:00:00 AM',
        '09/06/2022 7:00:00 AM',
        '09/06/2022 8:00:00 AM',
        '09/06/2022 11:00:00 AM',
        '09/06/2022 12:00:00 AM',
      ];
      const result = [];
      for (let i = 0; i < time.length; i++) {
        const v1 = (Math.floor(Math.random() * 10000) + 1000) * 10e4;
        const v2 = (Math.floor(Math.random() * 10000) + 1000) * 10e4;
        result.push({
          timestamp: dayjs(time[i]).valueOf(),
          average: v1 < v2 ? v1 : v2,
          highest: v1 < v2 ? v2 : v1,
        });
      }
      const currentValue = (Math.floor(Math.random() * 100000) + 20000) * 10e5;
      return res.send({ data: result, difference: 1.5, currentValue });
    } catch (error) {
      res.status(500).send('Internal Error.');
    }
  },
);

statsController.get('/cascade-requests', async (req, res) => {
  try {
    const { period } = queryWithSortSchema(
      sortByTotalSupplyFields,
    ).validateSync(req.query);
    const data = await ticketService.getSenseOrCascadeRequest(
      period,
      'cascade',
    );
    const item = await ticketService.countTotalSenseOrCascadeRequest(
      period,
      'cascade',
    );
    const difference = await ticketService.getDifferenceSenseOrCascade(
      period,
      'cascade',
    );
    return res.send({ data, difference, currentValue: item?.total || 0 });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

statsController.get('/total-data-stored-on-cascade', async (req, res) => {
  try {
    const time = [
      '08/08/2022 12:00:00 AM',
      '08/09/2022 12:00:00 AM',
      '08/10/2022 12:00:00 AM',
      '08/11/2022 12:00:00 AM',
      '08/12/2022 12:00:00 AM',
      '08/13/2022 12:00:00 AM',
      '08/14/2022 12:00:00 AM',
      '08/15/2022 12:00:00 AM',
      '08/16/2022 12:00:00 AM',
      '08/23/2022 12:00:00 AM',
      '08/24/2022 12:00:00 AM',
      '08/25/2022 12:00:00 AM',
      '08/26/2022 12:00:00 AM',
      '08/27/2022 12:00:00 AM',
      '08/28/2022 3:00:00 AM',
      '08/28/2022 4:00:00 AM',
      '08/28/2022 6:00:00 AM',
      '08/28/2022 12:00:00 AM',
      '08/29/2022 12:00:00 AM',
      '08/30/2022 12:00:00 AM',
      '08/31/2022 12:00:00 AM',
      '09/01/2022 12:00:00 AM',
      '09/02/2022 12:00:00 AM',
      '09/03/2022 12:00:00 AM',
      '09/04/2022 12:00:00 AM',
      '09/05/2022 12:00:00 AM',
      '09/06/2022 7:00:00 AM',
      '09/06/2022 8:00:00 AM',
      '09/06/2022 11:00:00 AM',
      '09/06/2022 12:00:00 AM',
    ];

    const result = [];
    for (let i = 0; i < time.length; i++) {
      result.push({
        timestamp: dayjs(time[i]).valueOf(),
        value: (Math.floor(Math.random() * 11000) + 6000) * 10e4,
      });
    }
    const currentValue = (Math.floor(Math.random() * 90000) + 70800) * 10e6;
    return res.send({ data: result, difference: 0.8, currentValue });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});
