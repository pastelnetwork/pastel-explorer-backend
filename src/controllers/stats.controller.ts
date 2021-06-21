import express from 'express';

import { StatsEntity } from '../entity/stats.entity';
import blockService from '../services/block.service';
import { calculateHashrate } from '../services/hashrate.service';
import statsService from '../services/stats.service';
import { getStartPoint, TPeriod } from '../utils/period';

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

statsController.get('/hashrate', async (req, res) => {
  const period = req.query.period as TPeriod | undefined;
  try {
    const fromTime = getStartPoint(period);
    const blocks = await blockService.findAllBetweenTimestamps(
      fromTime,
      new Date().getTime(),
    );
    const hashrates = blocks.map(b => [
      b.timestamp,
      calculateHashrate(b.blockCountLastDay, Number(b.difficulty), true),
    ]);
    return res.send({
      data: hashrates,
    });
  } catch (error) {
    return res.status(500).send('Internal Error.');
  }
});
