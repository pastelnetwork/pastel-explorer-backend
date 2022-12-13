import dayjs from 'dayjs';
import express, { Request } from 'express';

import { MiningInfoEntity } from '../entity/mininginfo.entity';
import addressEventsService from '../services/address-events.service';
import blockService from '../services/block.service';
import hashrateService from '../services/hashrate.service';
import marketDataService from '../services/market-data.service';
import masternodeService from '../services/masternode.service';
import mempoolinfoService from '../services/mempoolinfo.service';
import nettotalsServices from '../services/nettotals.services';
import statsMiningService from '../services/stats.mining.service';
import statsService, {
  getCoinCirculatingSupply,
  getPercentPSLStaked,
} from '../services/stats.service';
import transactionService from '../services/transaction.service';
import { IQueryParameters } from '../types/query-request';
import {
  fiveMillion,
  sortByAccountFields,
  sortByBlocksFields,
  sortByMempoolFields,
  sortByMiningFields,
  sortByNettotalsFields,
  sortByStatsFields,
  sortByTotalSupplyFields,
  sortHashrateFields,
} from '../utils/constants';
import { getStartDate } from '../utils/helpers';
import { marketPeriodData, periodCallbackData, TPeriod } from '../utils/period';
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

// statsController.get('/hashrate', async (req, res) => {
//   const period = req.query.period as TPeriod | undefined;
//   try {
//     const fromTime = getStartPoint(period);
//     const blocks = await blockService.findAllBetweenTimestamps(
//       fromTime,
//       new Date().getTime(),
//     );
//     const hashrates = blocks.map(b => [
//       b.timestamp,
//       calculateHashrate(b.blockCountLastDay, Number(b.difficulty), true),
//     ]);
//     return res.send({
//       data: hashrates,
//     });
//   } catch (error) {
//     return res.status(500).send('Internal Error.');
//   }
// });

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
    const startTime = Number(req.query?.timestamp?.toString() || '');
    let blocks = await mempoolinfoService.getAll(
      offset,
      limit,
      sortBy || 'timestamp',
      !useSort ? 'ASC' : sortDirection || 'DESC',
      period,
      startTime,
    );
    if (
      periodCallbackData.indexOf(period) !== -1 &&
      !blocks.length &&
      !startTime
    ) {
      blocks = await mempoolinfoService.getLastData(period);
    }
    return res.send({
      data: blocks,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message || error });
  }
});

statsController.get('/average-fee-of-transaction', async (req, res) => {
  try {
    const period = req.query.period as TPeriod;
    const transactions = await transactionService.getAverageTransactionFee(
      period,
    );
    return res.send({
      data: transactions,
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
      blocks = await blockService.getLastData('', period, '', '', '', true);
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
    const { period } = validateMarketChartsSchema.validateSync(req.query);
    const data = await marketDataService.getCoins('market_chart', {
      vs_currency: 'usd',
      days:
        getStartDate(Number(req.query?.timestamp?.toString() || '')) ||
        marketPeriodData[period],
    });
    res.send({ data });
  } catch (error) {
    res.status(400).send({ error: error.message || error });
  }
});

statsController.get('/total-supply', async (req, res) => {
  try {
    const { offset, limit, sortDirection, sortBy, period } =
      queryWithSortSchema(sortByTotalSupplyFields).validateSync(req.query);

    const data = await statsService.getAll(
      offset,
      limit,
      sortBy || 'timestamp',
      sortDirection || 'DESC',
      period,
    );
    res.send({ data });
  } catch (error) {
    res.status(400).send({ error: error.message || error });
  }
});

statsController.get('/accounts', async (req, res) => {
  try {
    const { offset, limit, sortDirection, sortBy, period } =
      queryWithSortSchema(sortByAccountFields).validateSync(req.query);
    const startTime = Number(req.query?.timestamp?.toString() || '');
    let data = await statsService.getAll(
      offset,
      limit,
      sortBy || 'timestamp',
      sortDirection || 'DESC',
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
    const incomingSum = await addressEventsService.sumAllEventsAmount(
      process.env.PASTEL_BURN_ADDRESS,
      'Incoming' as TransferDirectionEnum,
    );
    const data = [];
    const pslStaked = (await masternodeService.countFindAll()) * fiveMillion;
    for (let i = 0; i < items.length; i++) {
      const val =
        getCoinCirculatingSupply(pslStaked, items[i].coinSupply) - incomingSum;
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
      data.push({
        time: date.valueOf(),
        value: getPercentPSLStaked(total * fiveMillion, coinSupply),
      });
    }

    res.send({ data: data.sort((a, b) => a.time - b.time) });
  } catch (error) {
    res.status(400).send({ error: error.message || error });
  }
});
