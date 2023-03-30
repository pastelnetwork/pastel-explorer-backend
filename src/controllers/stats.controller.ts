import dayjs from 'dayjs';
import express, { Request } from 'express';

import { MiningInfoEntity } from '../entity/mininginfo.entity';
import blockService from '../services/block.service';
import hashrateService from '../services/hashrate.service';
import marketDataService from '../services/market-data.service';
import masternodeService from '../services/masternode.service';
import mempoolinfoService from '../services/mempoolinfo.service';
import nettotalsServices from '../services/nettotals.services';
import registeredCascadeFilesService from '../services/registered-cascade-files.service';
import registeredSenseFilesService from '../services/registered-sense-files.service';
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

/**
 * @swagger
 * /v1/stats:
 *   get:
 *     summary: Get stats
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatsData'
 *       500:
 *         description: Internal Error.
 */
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

/**
 * @swagger
 * /v1/stats/historical-statistics:
 *   get:
 *     summary: Get historical statistics
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["24h", "7d", "14d", "30d", "90d", "180d", "1y", "max"]
 *         required: true
 *       - in: query
 *         name: fields
 *         explode: false
 *         default: ["difficulty", "timestamp", "usdPrice", "btcPrice"]
 *         schema:
 *           type: array
 *           items:
 *            type: string
 *            enum: ["difficulty", "timestamp", "usdPrice", "btcPrice"]
 *         required: true
 *       - in: query
 *         name: sortDirection
 *         default: "DESC"
 *         schema:
 *           type: string
 *           enum: ["DESC", "ASC"]
 *         required: false
 *       - in: query
 *         name: sortBy
 *         default: "timestamp"
 *         schema:
 *           type: string
 *           enum: ["id", "timestamp", "difficulty", "usdPrice"]
 *         required: false
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HistoricalStatistics'
 *       400:
 *         description: Error message
 */
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

/**
 * @swagger
 * /v1/stats/mining-list:
 *   get:
 *     summary: Get mining list
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "12h"
 *         schema:
 *           type: string
 *           enum: ["1h", "3h", "6h", "12h"]
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MiningResponse'
 *       400:
 *         description: Error message
 */
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

/**
 * @swagger
 * /v1/stats/mempool-info-list:
 *   get:
 *     summary: Get mempool info list
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["24h", "7d", "14d", "30d", "90d", "180d", "1y", "max"]
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MempoolInfoResponse'
 *       400:
 *         description: Error message
 */
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

/**
 * @swagger
 * /v1/stats/nettotals-list:
 *   get:
 *     summary: Get nettotals list
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["24h", "7d", "14d", "30d", "90d", "180d", "1y", "max"]
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NettotalsResponse'
 *       400:
 *         description: Error message
 */
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

/**
 * @swagger
 * /v1/stats/blocks-list:
 *   get:
 *     summary: Get block list
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "12h"
 *         schema:
 *           type: string
 *           enum: ["1h", "3h", "6h", "12h"]
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlockResponse'
 *       400:
 *         description: Error message
 */
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

/**
 * @swagger
 * /v1/stats/average-block-size:
 *   get:
 *     summary: Get average block size
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["24h", "7d", "14d", "30d", "90d", "180d", "1y", "max"]
 *         required: true
 *       - in: query
 *         name: granularity
 *         default: "none"
 *         schema:
 *           type: string
 *           enum: ["1d", "30d", "1y", "none"]
 *         required: false
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AverageBlockSizeResponse'
 *       400:
 *         description: Error message
 */
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

/**
 * @swagger
 * /v1/stats/transaction-per-second:
 *   get:
 *     summary: Get transaction per second
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["24h", "7d", "14d", "30d", "90d", "180d", "1y", "max"]
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AverageBlockSizeResponse'
 *       400:
 *         description: Error message
 */
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

/**
 * @swagger
 * /v1/stats/mining-charts:
 *   get:
 *     summary: Get mining data for charts
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["24h", "7d", "14d", "30d", "90d", "180d", "1y", "max"]
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MiningChartResponse'
 *       400:
 *         description: Error message
 *       500:
 *         description: Internal Error.
 */
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

/**
 * @swagger
 * /v1/stats/market/chart:
 *   get:
 *     summary: Get market data for charts
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["24h", "7d", "14d", "30d", "90d", "180d", "1y", "max"]
 *         required: true
 *       - in: query
 *         name: chart
 *         default: "price"
 *         schema:
 *           type: string
 *           enum: ["price", "cap"]
 *         required: false
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MarketResponse'
 *       400:
 *         description: Error message
 */
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

/**
 * @swagger
 * /v1/stats/accounts:
 *   get:
 *     summary: Get accounts
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           default: "30d"
 *           enum: ["24h", "7d", "14d", "30d", "90d", "180d", "1y", "max"]
 *         required: true
 *       - in: query
 *         name: fields
 *         explode: false
 *         default: ["nonZeroAddressesCount", "timestamp"]
 *         schema:
 *           type: array
 *           explode: true
 *           items:
 *            type: string
 *            enum: ["coinSupply", "totalBurnedPSL", "nonZeroAddressesCount", "timestamp"]
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountsResponse'
 *       400:
 *         description: Error message
 */
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

/**
 * @swagger
 * /v1/stats/circulating-supply:
 *   get:
 *     summary: Get circulating supply
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["24h", "7d", "14d", "30d", "90d", "180d", "1y", "max"]
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CirculatingSupplyResponse'
 *       400:
 *         description: Error message
 */
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

/**
 * @swagger
 * /v1/stats/percent-of-psl-staked:
 *   get:
 *     summary: Get percent of PSL staked
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["24h", "7d", "14d", "30d", "90d", "180d", "1y", "max"]
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PercentOfPslStakedResponse'
 *       400:
 *         description: Error message
 */
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

/**
 * @swagger
 * /v1/stats/current-stats:
 *   get:
 *     summary: Get current stats(usdPrice, coinSupply)
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CurrentStatsOfUsdPriceCoinSupply'
 *       500:
 *         description: Internal Error
 */
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

/**
 * @swagger
 * /v1/stats/average-rareness-score-on-sense:
 *   get:
 *     summary: Get average rareness score on sense
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["24h", "7d", "30d", "1y", "max"]
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AverageRarenessScoreResponse'
 *       500:
 *         description: Internal Error
 */
statsController.get('/average-rareness-score-on-sense', async (req, res) => {
  try {
    const { period, startDate, endDate } = queryWithSortSchema(
      sortByTotalSupplyFields,
    ).validateSync(req.query);
    const data = await senseRequestsService.getAverageRarenessScoreForChart({
      period,
      startDate,
      endDate,
    });
    return res.send({
      data: data.data,
      difference: data.difference,
      currentValue: data.total,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/stats/sense-requests:
 *   get:
 *     summary: Get sense requests
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["24h", "7d", "30d", "1y", "max"]
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SenseRequestsResponse'
 *       500:
 *         description: Internal Error
 */
statsController.get('/sense-requests', async (req, res) => {
  try {
    const { period, startDate, endDate } = queryWithSortSchema(
      sortByTotalSupplyFields,
    ).validateSync(req.query);
    const data = await ticketService.getSenseOrCascadeRequest({
      period,
      type: 'sense',
      startDate,
      endDate,
    });
    return res.send({
      data: data.data,
      difference: data.difference,
      currentValue: data.total,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/stats/total-fingerprints-on-sense:
 *   get:
 *     summary: Get total fingerprints on sense
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["24h", "7d", "30d", "1y", "max"]
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SenseRequestsResponse'
 *       500:
 *         description: Internal Error
 */
statsController.get('/total-fingerprints-on-sense', async (req, res) => {
  try {
    const { period, startDate, endDate } = queryWithSortSchema(
      sortByTotalSupplyFields,
    ).validateSync(req.query);
    const data = await registeredSenseFilesService.getTotalFingerprints({
      period,
      startDate,
      endDate,
    });
    return res.send({
      data: data.data,
      difference: data.difference,
      currentValue: data.total,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/stats/average-size-of-nft-stored-on-cascade:
 *   get:
 *     summary: Get average size of NFT stored on cascade
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["24h", "7d", "30d", "1y", "max"]
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AverageRarenessScoreResponse'
 *       500:
 *         description: Internal Error
 */
statsController.get(
  '/average-size-of-nft-stored-on-cascade',
  async (req, res) => {
    try {
      const { period, startDate, endDate } = queryWithSortSchema(
        sortByTotalSupplyFields,
      ).validateSync(req.query);

      const data =
        await registeredCascadeFilesService.getAverageSizeOfNFTStored({
          period,
          startDate,
          endDate,
        });
      return res.send({
        data: data.data,
        difference: data.difference,
        currentValue: data.total,
      });
    } catch (error) {
      console.log(error);
      res.status(500).send('Internal Error.');
    }
  },
);

/**
 * @swagger
 * /v1/stats/cascade-requests:
 *   get:
 *     summary: Get cascade requests
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["24h", "7d", "30d", "1y", "max"]
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SenseRequestsResponse'
 *       500:
 *         description: Internal Error
 */
statsController.get('/cascade-requests', async (req, res) => {
  try {
    const { period, startDate, endDate } = queryWithSortSchema(
      sortByTotalSupplyFields,
    ).validateSync(req.query);
    const data = await ticketService.getSenseOrCascadeRequest({
      period,
      type: 'cascade',
      startDate,
      endDate,
    });
    return res.send({
      data: data.data,
      difference: data.difference,
      currentValue: data.total,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/stats/total-data-stored-on-cascade:
 *   get:
 *     summary: Get total data stored on cascade
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["24h", "7d", "30d", "1y", "max"]
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SenseRequestsResponse'
 *       500:
 *         description: Internal Error
 */
statsController.get('/total-data-stored-on-cascade', async (req, res) => {
  try {
    const { period, startDate, endDate } = queryWithSortSchema(
      sortByTotalSupplyFields,
    ).validateSync(req.query);

    const data = await registeredCascadeFilesService.getTotalDataStored({
      period,
      startDate,
      endDate,
    });
    return res.send({
      data: data.data,
      difference: data.difference,
      currentValue: data.total,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/stats/burned-by-month:
 *   get:
 *     summary: Get burned by month
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "1y"
 *         schema:
 *           type: string
 *           enum: ["1y", "2y", "max"]
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               example: [{"time": 1649030400000,"value": 59492.29999999993}]
 *       500:
 *         description: Internal Error
 */
statsController.get('/burned-by-month', async (req, res) => {
  try {
    const { period } = queryWithSortSchema(
      sortByTotalSupplyFields,
    ).validateSync(req.query);
    const data = await statsService.getBurnedByMonth(period);
    return res.send(data);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/stats/total-burned:
 *   get:
 *     summary: Get total burned
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["30d", "60d", "180d", "1y", "max"]
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TotalBurnedResponse'
 *       500:
 *         description: Internal Error
 */
statsController.get('/total-burned', async (req, res) => {
  try {
    const { period } = queryWithSortSchema(
      sortByTotalSupplyFields,
    ).validateSync(req.query);

    const data = await statsService.getTotalBurned(period);

    return res.send({
      data,
      totalBurned: data.length ? data[data.length - 1].value : 0,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});
