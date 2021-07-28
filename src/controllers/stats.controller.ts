import express, { Request } from 'express';

import { MiningInfoEntity } from '../entity/mininginfo.entity';
import blockService from '../services/block.service';
import mempoolinfoService from '../services/mempoolinfo.service';
import nettotalsServices from '../services/nettotals.services';
import statsMiningService from '../services/stats.mining.service';
import statsService from '../services/stats.service';
import transactionService from '../services/transaction.service';
import { IQueryParameters } from '../types/query-request';
import { TPeriod } from '../utils/period';
import {
  queryPeriodGranularitySchema,
  queryPeriodSchema,
  queryWithSortSchema,
  validateQueryWithGroupData,
} from '../utils/validator';

export const statsController = express.Router();

statsController.get('/', async (req, res) => {
  try {
    const [currentStats, lastDayStats] = await Promise.all([
      statsService.getLatest(),
      statsService.getDayAgo(),
    ]);
    return res.send({
      currentStats,
      lastDayStats,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

statsController.get('/list', async (req, res) => {
  const sortByFields = ['id', 'timestamp', 'difficulty', 'usdPrice'];
  try {
    const { offset, limit, sortDirection, sortBy, period } =
      queryWithSortSchema(sortByFields).validateSync(req.query);
    const blocks = await statsService.getAll(
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
  const sortByFields = [
    'id',
    'timestamp',
    'blocks',
    'currentblocksize',
    'currentblocktx',
    'difficulty',
    'errors',
    'genproclimit',
    'localsolps',
    'networksolps',
    'networkhashps',
    'pooledtx',
    'chain',
    'generate',
  ];
  try {
    const { offset, limit, sortDirection, sortBy, period } =
      queryWithSortSchema(sortByFields).validateSync(req.query);
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
  const sortByFields = ['id', 'timestamp', 'size', 'bytes', 'usage'];
  try {
    const { offset, limit, sortDirection, sortBy, period } =
      queryWithSortSchema(sortByFields).validateSync(req.query);
    const blocks = await mempoolinfoService.getAll(
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
  const sortByFields = [
    'id',
    'timestamp',
    'totalbytesrecv',
    'totalbytessent',
    'timemillis',
  ];
  try {
    const { offset, limit, sortDirection, sortBy, period } =
      queryWithSortSchema(sortByFields).validateSync(req.query);
    const blocks = await nettotalsServices.getAll(
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

statsController.get('/blocks-list', async (req, res) => {
  const sortByFields = [
    'id',
    'timestamp',
    'height',
    'confirmations',
    'size',
    'transactionCount',
  ];
  try {
    const { offset, limit, sortDirection, sortBy, period } =
      queryWithSortSchema(sortByFields).validateSync(req.query);
    const blocks = await blockService.getStatisticsBlocks(
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

statsController.get('/average-block-size', async (req, res) => {
  try {
    const { period, granularity } = queryPeriodGranularitySchema.validateSync(
      req.query,
    );
    const data = await blockService.getAverageBlockSizeStatistics(
      period,
      granularity,
    );
    res.send({ data });
  } catch (error) {
    return res.status(400).send({ error: error.message || error });
  }
});

statsController.get('/transaction-per-second', async (req, res) => {
  try {
    const { period } = queryPeriodSchema.validateSync(req.query);
    const data = await transactionService.getTransactionPerSecond(period);
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
      const { period, granularity, func, col } =
        validateQueryWithGroupData.validateSync(req.query);
      const sqlQuery = `${func}(${col})`;
      const data = await statsMiningService.getMiningCharts(
        sqlQuery,
        period,
        granularity,
      );
      return res.send({ data });
    } catch (e) {
      if (typeof e.message === 'string') {
        return res.status(400).send({ error: e.message });
      }
      return res.status(500).send('Internal Error.');
    }
  },
);
