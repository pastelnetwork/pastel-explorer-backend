import dayjs from 'dayjs';
import { BlockEntity } from 'entity/block.entity';
import express, { Request } from 'express';

import { MiningInfoEntity } from '../entity/mininginfo.entity';
import { TransactionEntity } from '../entity/transaction.entity';
import addressService from '../services/address.service';
import addressEventsService from '../services/address-events.service';
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
import supernodeFeeScheduleService from '../services/supernode-fee-schedule.service';
import ticketService from '../services/ticket.service';
import transactionService from '../services/transaction.service';
import { IQueryParameters } from '../types/query-request';
import {
  periodGroupByHourly,
  sortByAccountFields,
  sortByBlocksFields,
  sortByMempoolFields,
  sortByMiningFields,
  sortByNettotalsFields,
  sortByStatsFields,
  sortByTotalSupplyFields,
  sortHashrateFields,
} from '../utils/constants';
import { getTheNumberOfTotalSupernodes } from '../utils/helpers';
import {
  marketPeriodData,
  marketPeriodField,
  periodCallbackData,
  TPeriod,
} from '../utils/period';
import {
  IQueryGrouDataSchema,
  queryPeriodGranularitySchema,
  queryPeriodSchema,
  queryTransactionLatest,
  queryWithSortSchema,
  validateMarketChartsSchema,
  validateQueryWithGroupData,
} from '../utils/validator';

export const statsController = express.Router();

/**
 * @swagger
 * /v1/stats/live-dashboard-statistics:
 *   get:
 *     summary: Get the data for the Circulating Supply, Total Supply, % of LSP Staked, Accounts, Network, Difficulty, Average Block Size and Transactions on the dashboard of the explorer.
 *     tags: [Other statistics]
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
statsController.get('/live-dashboard-statistics', async (req, res) => {
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
 *     tags: [Historical Statistics]
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
 * /v1/stats/hashrate:
 *   get:
 *     summary: Get hashrate
 *     tags: [Current Statistics]
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
statsController.get('/hashrate', async (req, res) => {
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
 *     tags: [Historical Statistics]
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
 *     tags: [Historical Statistics]
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
 *     tags: [Historical Statistics]
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
 *     tags: [Historical Statistics]
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
 *     tags: [Historical Statistics]
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
 * /v1/stats/historical-hashrate:
 *   get:
 *     summary: Get the data for the Hashrate
 *     tags: [Historical Statistics]
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
  '/historical-hashrate',
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
 * /v1/stats/market-price:
 *   get:
 *     summary: Get the data for the Market Price and Volume and Market Price and Circ. Cap
 *     tags: [Historical Statistics]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["24h", "7d", "14d", "30d", "90d", "180d", "1y", "max"]
 *         required: true
 *       - in: query
 *         name: chart_name
 *         default: "volume"
 *         schema:
 *           type: string
 *           enum: ["volume", "cap"]
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
statsController.get('/market-price', async (req, res) => {
  try {
    const { period, chart_name: chart } =
      validateMarketChartsSchema.validateSync(req.query);
    const data = await marketDataService.getMarketPriceByPeriod(
      marketPeriodField[period as keyof typeof marketPeriodField],
    );
    if (chart === 'volume') {
      res.send({
        data: {
          prices: data?.prices || [],
          total_volumes: data?.total_volumes || [],
        },
      });
      return;
    }
    res.send({
      data: {
        prices: data?.prices || [],
        market_caps: data?.market_caps || [],
      },
    });
  } catch (error) {
    res.status(400).send({ error: error.message || error });
  }
});

/**
 * @swagger
 * /v1/stats/accounts:
 *   get:
 *     summary: Get accounts
 *     tags: [Historical Statistics]
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
 *     tags: [Historical Statistics]
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
 * /v1/stats/fee-schedule:
 *   get:
 *     summary: Get fee schedule
 *     tags: [Historical Statistics]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["7d", "14d", "30d", "90d", "180d", "1y", "max"]
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
statsController.get('/fee-schedule', async (req, res) => {
  try {
    const { period } = queryWithSortSchema(
      sortByTotalSupplyFields,
    ).validateSync(req.query);
    const data = await supernodeFeeScheduleService.getDataForChart(period);
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
 *     tags: [Historical Statistics]
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
 * /v1/stats/average-rareness-score-on-sense:
 *   get:
 *     summary: Get average rareness score on sense
 *     tags: [Cascade and Sense Statistics]
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
 *     tags: [Cascade and Sense Statistics]
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
 *     tags: [Cascade and Sense Statistics]
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
 *     tags: [Cascade and Sense Statistics]
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
 *     tags: [Cascade and Sense Statistics]
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
 *     tags: [Cascade and Sense Statistics]
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
 *     summary: Get burned by month of the Pastel Network
 *     tags: [Other statistics]
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
 *     summary: Get total burned of the Pastel Network
 *     tags: [Other statistics]
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

/**
 * @swagger
 * /v1/stats/block-sizes:
 *   get:
 *     summary: Get block size
 *     tags: [Current Statistics]
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
 *         description: object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlocksSize'
 *       400:
 *         description: Error message
 */
statsController.get(
  '/block-sizes',
  async (
    req: Request<unknown, unknown, unknown, IQueryParameters<BlockEntity>>,
    res,
  ) => {
    try {
      const {
        sortBy = 'timestamp',
        limit,
        offset,
        sortDirection = 'DESC',
        period,
      } = queryWithSortSchema(sortByBlocksFields).validateSync(req.query);
      const blocks = await blockService.getAllBlockSize(
        offset,
        limit,
        sortBy,
        sortDirection,
        period,
      );

      return res.send({
        data: blocks,
      });
    } catch (error) {
      return res.status(400).send({ error: error.message || error });
    }
  },
);

/**
 * @swagger
 * /v1/stats/blocks-statistics:
 *   get:
 *     summary: Get block statistics
 *     tags: [Current Statistics]
 *     parameters:
 *       - in: query
 *         name: limit
 *         default: 5000
 *         schema:
 *           type: number
 *         required: true
 *       - in: query
 *         name: offset
 *         default: 0
 *         schema:
 *           type: number
 *         required: true
 *     responses:
 *       200:
 *         description: array
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlocksStatistics'
 *       400:
 *         description: Error message
 */
statsController.get(
  '/blocks-statistics',
  async (
    req: Request<unknown, unknown, unknown, IQueryParameters<BlockEntity>>,
    res,
  ) => {
    try {
      const {
        sortBy = 'timestamp',
        limit,
        offset,
        sortDirection = 'DESC',
        period,
      } = queryWithSortSchema(sortByBlocksFields).validateSync(req.query);
      const blocks = await blockService.getAllBlockForStatistics(
        offset,
        limit || 5000,
        sortBy,
        sortDirection,
        period,
      );

      return res.send({
        data: blocks,
      });
    } catch (error) {
      return res.status(400).send({ error: error.message || error });
    }
  },
);

/**
 * @swagger
 * /v1/stats/unconfirmed-blocks:
 *   get:
 *     summary: Get unconfirmed blocks
 *     tags: [Current Statistics]
 *     responses:
 *       200:
 *         description: Data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlocksUnconfirmed'
 */
statsController.get('/unconfirmed-blocks', async (_req, res) => {
  const transactions = await transactionService.getBlocksUnconfirmed();
  res.send({
    data: transactions,
  });
});

/**
 * @swagger
 * /v1/stats/incoming-transactions:
 *   get:
 *     summary: Get incoming transactions
 *     tags: [Current Statistics]
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
 *         description: Data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VolumeChartData'
 *       400:
 *         description: Error message
 */
statsController.get('/incoming-transactions', async (req, res) => {
  try {
    const { period } = queryTransactionLatest.validateSync(req.query);
    const transactions = await transactionService.findFromTimestamp(
      period as TPeriod,
    );

    const dataSeries = transactions.map(t => [
      t.timestamp / 1000,
      t.totalAmount,
    ]);

    return res.send({
      data: dataSeries,
    });
  } catch (error) {
    res.status(400).send({ error: error.message || error });
  }
});

/**
 * @swagger
 * /v1/stats/volume-of-transactions:
 *   get:
 *     summary: Get volume of transactions
 *     tags: [Current Statistics]
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
 *         description: Data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VolumeChartData'
 *       400:
 *         description: Error message
 */
statsController.get('/volume-of-transactions', async (req, res) => {
  try {
    const { period } = queryPeriodSchema.validateSync(req.query);
    const transactions =
      await transactionService.getVolumeOfTransactions(period);
    const dataSeries = transactions.map(t => [t.timestamp, t.sum]);
    return res.send({
      data: dataSeries,
    });
  } catch (error) {
    res.status(400).send({ error: error.message || error });
  }
});

/**
 * @swagger
 * /v1/stats/historical-blocks-statistics:
 *   get:
 *     summary: Get the data for the Blockchain Size and Average Transactions Per Block
 *     tags: [Historical Statistics]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["24h", "7d", "14d", "30d", "90d", "180d", "1y", "max"]
 *         required: true
 *       - in: query
 *         name: func
 *         default: "AVG"
 *         schema:
 *           type: string
 *           enum: ["AVG", "SUM"]
 *         required: true
 *       - in: query
 *         name: col
 *         default: "transactionCount"
 *         schema:
 *           type: string
 *           enum: ["transactionCount", "size"]
 *         required: true
 *     responses:
 *       200:
 *         description: object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlocksChart'
 *       400:
 *         description: Error message
 */
statsController.get(
  '/historical-blocks-statistics',
  async (
    req: Request<unknown, unknown, unknown, IQueryParameters<BlockEntity>>,
    res,
  ) => {
    try {
      const { period, func, col, name, granularity }: IQueryGrouDataSchema =
        validateQueryWithGroupData.validateSync(req.query);
      const sqlQuery = `${func}(${col})`;

      if (name === 'blockchainSize') {
        const data = await blockService.getBlockchainSizeInfo(
          sqlQuery,
          period,
          'ASC',
          Number(req.query?.timestamp?.toString() || ''),
        );
        return res.send({
          data: data.items,
          startValue: data.startValue || 0,
          endValue: data.endValue,
        });
      } else {
        const data = await blockService.getBlocksInfo(
          sqlQuery,
          period,
          !granularity
            ? periodGroupByHourly.includes(period)
              ? '1d'
              : 'none'
            : granularity,
          'ASC',
          Number(req.query?.timestamp?.toString() || ''),
        );
        return res.send({ data });
      }
    } catch (e) {
      return res.status(400).send({ error: e.message || e });
    }
  },
);

/**
 * @swagger
 * /v1/stats/transactions-statistics:
 *   get:
 *     summary: Get the data for the Total Transaction Fees, Total Transactions Per Day, Total Transaction Count, Transaction Count,  and Average Transaction Fee
 *     tags: [Historical Statistics]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["24h", "7d", "14d", "30d", "90d", "180d", "1y", "max"]
 *         required: true
 *       - in: query
 *         name: func
 *         default: "COUNT"
 *         schema:
 *           type: string
 *           enum: ["COUNT", "SUM", "AVG"]
 *         required: true
 *       - in: query
 *         name: col
 *         default: "id"
 *         schema:
 *           type: string
 *           enum: ["id", "fee"]
 *         required: true
 *     responses:
 *       200:
 *         description: Data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionsChartsData'
 *       400:
 *         description: Error message
 */
statsController.get(
  '/transactions-statistics',
  async (
    req: Request<
      unknown,
      unknown,
      unknown,
      IQueryParameters<TransactionEntity>
    >,
    res,
  ) => {
    try {
      const { period, func, col } = validateQueryWithGroupData.validateSync(
        req.query,
      );
      const sqlQuery = `${func}(${col})`;
      const startTime = Number(req.query?.timestamp?.toString() || '');
      const data = await transactionService.getTransactionsInfo(
        sqlQuery,
        period,
        'ASC',
        startTime,
        req.query.groupBy,
        req.query.startValue,
      );
      return res.send({
        data: data.items,
        startValue: data.startValue,
        endValue: data.endValue,
      });
    } catch (e) {
      return res.status(400).send({ error: e.message });
    }
  },
);

/**
 * @swagger
 * /v1/stats/balance-history/{psl_address}:
 *   get:
 *     summary: Get balance history of an address
 *     tags: [Other statistics]
 *     parameters:
 *       - in: path
 *         name: psl_address
 *         default: "tPdEXG67WRZeg6mWiuriYUGjLn5hb8TKevb"
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BalanceHistory'
 *       400:
 *         description: PSL address is required
 *       500:
 *         description: Internal Error.
 */
statsController.get('/balance-history/:psl_address', async (req, res) => {
  try {
    const id: string = req.params.psl_address;
    if (!id) {
      return res.status(400).json({
        message: 'PSL address is required',
      });
    }

    const data = await addressEventsService.getBalanceHistory(
      id?.toString() || '',
    );
    const storageAddress = await addressService.getByAddress(
      id?.toString() || '',
    );
    return res.send({
      ...data,
      type: storageAddress?.type || '',
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/stats/direction/{psl_address}:
 *   get:
 *     summary: Get the total sent or received of an address monthly
 *     tags: [Other statistics]
 *     parameters:
 *       - in: path
 *         name: psl_address
 *         default: "tPdEXG67WRZeg6mWiuriYUGjLn5hb8TKevb"
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: direction
 *         required: true
 *         default: "Incoming"
 *         schema:
 *          type: string
 *          enum: ["Incoming", "Outgoing"]
 *     responses:
 *       200:
 *         description: Data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                $ref: '#/components/schemas/ReceivedOrSentByMonth'
 *       400:
 *         description: PSL address is required
 *       500:
 *         description: Internal Error.
 */
statsController.get('/direction/:psl_address', async (req, res) => {
  try {
    const { direction } = req.query;
    const id: string = req.params.psl_address;
    if (!id) {
      return res.status(400).json({
        message: 'PSL address is required',
      });
    }

    const data = await addressEventsService.getDirection(
      id.toString() || '',
      (direction || 'Incoming') as TransferDirectionEnum,
    );
    return res.send(data);
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Error.');
  }
});
