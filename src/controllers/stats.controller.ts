import express from 'express';

import { BlockEntity } from '../entity/block.entity';
import { MempoolInfoEntity } from '../entity/mempoolinfo.entity';
import { MiningInfoEntity } from '../entity/mininginfo.entity';
import { NettotalsEntity } from '../entity/nettotals.entity';
import { RawMemPoolInfoEntity } from '../entity/rawmempoolinfo.entity';
import { StatsEntity } from '../entity/stats.entity';
import blockService from '../services/block.service';
import mempoolinfoService from '../services/mempoolinfo.service';
import nettotalsServices from '../services/nettotals.services';
import rawmempoolinfoService from '../services/rawmempoolinfo.service';
import statsMiningService from '../services/stats.mining.service';
// import blockService from '../services/block.service';
// import { calculateHashrate } from '../services/hashrate.service';
import statsService from '../services/stats.service';
import transactionService from '../services/transaction.service';
import { TGranularity, TPeriod } from '../utils/period';

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
  const offset: number | undefined = Number(req.query.offset);
  const limit: number | undefined = Number(req.query.limit);
  const sortDirection = req.query.sortDirection === 'ASC' ? 'ASC' : 'DESC';
  const sortBy = req.query.sortBy as keyof StatsEntity;
  const period = req.query.period as TPeriod | undefined;
  const sortByFields = ['id', 'timestamp', 'difficulty', 'usdPrice'];
  if (sortBy && !sortByFields.includes(sortBy)) {
    return res.status(400).json({
      message: `sortBy can be one of following: ${sortByFields.join(',')}`,
    });
  }
  try {
    const blocks = await statsService.getAll(
      offset,
      limit,
      sortBy || 'timestamp',
      sortDirection,
      period,
    );

    return res.send({
      data: blocks,
    });
  } catch (error) {
    return res.status(500).send('Internal Error.');
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
  const offset: number | undefined = Number(req.query.offset);
  const limit: number | undefined = Number(req.query.limit);
  const sortDirection = req.query.sortDirection === 'ASC' ? 'ASC' : 'DESC';
  const sortBy = req.query.sortBy as keyof MiningInfoEntity;
  const period = req.query.period as TPeriod | undefined;
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
  if (sortBy && !sortByFields.includes(sortBy)) {
    return res.status(400).json({
      message: `sortBy can be one of following: ${sortByFields.join(',')}`,
    });
  }
  if (sortBy && !sortByFields.includes(sortBy)) {
    return res.status(400).json({
      message: `sortBy can be one of following: ${sortByFields.join(',')}`,
    });
  }
  try {
    const blocks = await statsMiningService.getAll(
      offset,
      limit,
      sortBy || 'timestamp',
      sortDirection,
      period,
    );

    return res.send({
      data: blocks,
    });
  } catch (error) {
    return res.status(500).send('Internal Error.');
  }
});

statsController.get('/raw-mempool-list', async (req, res) => {
  const offset: number | undefined = Number(req.query.offset);
  const limit: number | undefined = Number(req.query.limit);
  const sortDirection = req.query.sortDirection === 'ASC' ? 'ASC' : 'DESC';
  const sortBy = req.query.sortBy as keyof RawMemPoolInfoEntity;
  const period = req.query.period as TPeriod | undefined;
  const sortByFields = [
    'id',
    'timestamp',
    'transactionid',
    'size',
    'fee',
    'time',
    'height',
    'startingpriority',
    'currentpriority',
    'depends',
  ];
  if (sortBy && !sortByFields.includes(sortBy)) {
    return res.status(400).json({
      message: `sortBy can be one of following: ${sortByFields.join(',')}`,
    });
  }
  if (sortBy && !sortByFields.includes(sortBy)) {
    return res.status(400).json({
      message: `sortBy can be one of following: ${sortByFields.join(',')}`,
    });
  }
  try {
    const blocks = await rawmempoolinfoService.getAll(
      offset,
      limit,
      sortBy || 'timestamp',
      sortDirection,
      period,
    );

    return res.send({
      data: blocks,
    });
  } catch (error) {
    return res.status(500).send('Internal Error.');
  }
});

statsController.get('/mempool-info-list', async (req, res) => {
  const offset: number | undefined = Number(req.query.offset);
  const limit: number | undefined = Number(req.query.limit);
  const sortDirection = req.query.sortDirection === 'ASC' ? 'ASC' : 'DESC';
  const sortBy = req.query.sortBy as keyof MempoolInfoEntity;
  const period = req.query.period as TPeriod | undefined;
  const sortByFields = ['id', 'timestamp', 'size', 'bytes', 'usage'];
  if (sortBy && !sortByFields.includes(sortBy)) {
    return res.status(400).json({
      message: `sortBy can be one of following: ${sortByFields.join(',')}`,
    });
  }
  if (sortBy && !sortByFields.includes(sortBy)) {
    return res.status(400).json({
      message: `sortBy can be one of following: ${sortByFields.join(',')}`,
    });
  }
  try {
    const blocks = await mempoolinfoService.getAll(
      offset,
      limit,
      sortBy || 'timestamp',
      sortDirection,
      period,
    );

    return res.send({
      data: blocks,
    });
  } catch (error) {
    return res.status(500).send('Internal Error.');
  }
});

statsController.get('/nettotals-list', async (req, res) => {
  const offset: number | undefined = Number(req.query.offset);
  const limit: number | undefined = Number(req.query.limit);
  const sortDirection = req.query.sortDirection === 'ASC' ? 'ASC' : 'DESC';
  const sortBy = req.query.sortBy as keyof NettotalsEntity;
  const period = req.query.period as TPeriod | undefined;
  const sortByFields = [
    'id',
    'timestamp',
    'totalbytesrecv',
    'totalbytessent',
    'timemillis',
  ];
  if (sortBy && !sortByFields.includes(sortBy)) {
    return res.status(400).json({
      message: `sortBy can be one of following: ${sortByFields.join(',')}`,
    });
  }
  if (sortBy && !sortByFields.includes(sortBy)) {
    return res.status(400).json({
      message: `sortBy can be one of following: ${sortByFields.join(',')}`,
    });
  }
  try {
    const blocks = await nettotalsServices.getAll(
      offset,
      limit,
      sortBy || 'timestamp',
      sortDirection,
      period,
    );

    return res.send({
      data: blocks,
    });
  } catch (error) {
    return res.status(500).send('Internal Error.');
  }
});

statsController.get('/blocks-list', async (req, res) => {
  const offset: number | undefined = Number(req.query.offset);
  const limit: number | undefined = Number(req.query.limit);
  const sortDirection = req.query.sortDirection === 'ASC' ? 'ASC' : 'DESC';
  const sortBy = req.query.sortBy as keyof BlockEntity;
  const period = req.query.period as TPeriod | undefined;
  const sortByFields = [
    'id',
    'timestamp',
    'height',
    'confirmations',
    'size',
    'transactionCount',
  ];
  if (sortBy && !sortByFields.includes(sortBy)) {
    return res.status(400).json({
      message: `sortBy can be one of following: ${sortByFields.join(',')}`,
    });
  }
  if (sortBy && !sortByFields.includes(sortBy)) {
    return res.status(400).json({
      message: `sortBy can be one of following: ${sortByFields.join(',')}`,
    });
  }
  try {
    const blocks = await blockService.getStatisticsBlocks(
      offset,
      limit,
      sortBy || 'timestamp',
      sortDirection,
      period,
    );

    return res.send({
      data: blocks,
    });
  } catch (error) {
    return res.status(500).send('Internal Error.');
  }
});

statsController.get('/average-block-size', async (req, res) => {
  const period = req.query.period as TPeriod | undefined;
  const granularity = req.query.granularity as TGranularity;
  const data = await blockService.getAverageBlockSizeStatistics(
    period,
    granularity,
  );
  res.send({ data });
});

statsController.get('/transaction-per-second', async (req, res) => {
  const period = req.query.period as TPeriod;
  const data = await transactionService.getTransactionPerSecond(period);
  res.send({ data });
});
