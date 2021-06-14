import express from 'express';

import { MiningInfoEntity } from '../entity/mininginfo.entity';
import { PlsPriceEntity } from '../entity/plsprice.entity';
import { RawMemPoolInfoEntity } from '../entity/rawmempoolinfo.entity';
// import { StatsEntity } from '../entity/stats.entity';
import { StatsDifficultyEntity } from '../entity/statsdifficulty.entity';
import pslService from '../services/pslprice.service';
import statsRawMemoPoolService from '../services/rawmempoolinfo.service';
import statsMiningService from '../services/stats.mining.service';
import statsService from '../services/stats.service';
import statsdifficultyService from '../services/statsdifficulty.service';

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
  const offset: number = Number(req.query.offset) || 0;
  const limit: number = Number(req.query.limit) || 10;
  const sortDirection = req.query.sortDirection === 'ASC' ? 'ASC' : 'DESC';
  const sortBy = req.query.sortBy as keyof StatsDifficultyEntity;
  const sortByFields = ['id', 'timestamp', 'difficulty'];
  if (sortBy && !sortByFields.includes(sortBy)) {
    return res.status(400).json({
      message: `sortBy can be one of following: ${sortByFields.join(',')}`,
    });
  }
  if (typeof limit !== 'number' || limit < 0 || limit > 100) {
    return res.status(400).json({ message: 'limit must be between 0 and 100' });
  }
  try {
    const blocks = await statsdifficultyService.getAll(
      offset,
      limit,
      sortBy || 'timestamp',
      sortDirection,
    );

    return res.send({
      data: blocks,
    });
  } catch (error) {
    return res.status(500).send('Internal Error.');
  }
});

statsController.get('/prices-list', async (req, res) => {
  const offset: number = Number(req.query.offset) || 0;
  const limit: number = Number(req.query.limit) || 10;
  const sortDirection = req.query.sortDirection === 'ASC' ? 'ASC' : 'DESC';
  const sortBy = req.query.sortBy as keyof PlsPriceEntity;
  const sortByFields = ['id', 'timestamp', 'price_usd'];
  if (sortBy && !sortByFields.includes(sortBy)) {
    return res.status(400).json({
      message: `sortBy can be one of following: ${sortByFields.join(',')}`,
    });
  }
  if (typeof limit !== 'number' || limit < 0 || limit > 100) {
    return res.status(400).json({ message: 'limit must be between 0 and 100' });
  }
  try {
    const blocks = await pslService.getAll(
      offset,
      limit,
      sortBy || 'timestamp',
      sortDirection,
    );

    return res.send({
      data: blocks,
    });
  } catch (error) {
    return res.status(500).send('Internal Error.');
  }
});

statsController.get('/mining-list', async (req, res) => {
  const offset: number = Number(req.query.offset) || 0;
  const limit: number = Number(req.query.limit) || 10;
  const sortDirection = req.query.sortDirection === 'ASC' ? 'ASC' : 'DESC';
  const sortBy = req.query.sortBy as keyof MiningInfoEntity;
  const sortByFields = ['id', 'timestamp', 'price_usd'];
  if (sortBy && !sortByFields.includes(sortBy)) {
    return res.status(400).json({
      message: `sortBy can be one of following: ${sortByFields.join(',')}`,
    });
  }
  if (typeof limit !== 'number' || limit < 0 || limit > 100) {
    return res.status(400).json({ message: 'limit must be between 0 and 100' });
  }
  try {
    const blocks = await statsMiningService.getAll(
      offset,
      limit,
      sortBy || 'timestamp',
      sortDirection,
    );

    return res.send({
      data: blocks,
    });
  } catch (error) {
    return res.status(500).send('Internal Error.');
  }
});

statsController.get('/raw-mem-pool-list', async (req, res) => {
  const offset: number = Number(req.query.offset) || 0;
  const limit: number = Number(req.query.limit) || 10;
  const sortDirection = req.query.sortDirection === 'ASC' ? 'ASC' : 'DESC';
  const sortBy = req.query.sortBy as keyof RawMemPoolInfoEntity;
  const sortByFields = ['id', 'timestamp', 'price_usd'];
  if (sortBy && !sortByFields.includes(sortBy)) {
    return res.status(400).json({
      message: `sortBy can be one of following: ${sortByFields.join(',')}`,
    });
  }
  if (typeof limit !== 'number' || limit < 0 || limit > 100) {
    return res.status(400).json({ message: 'limit must be between 0 and 100' });
  }
  try {
    const blocks = await statsRawMemoPoolService.getAll(
      offset,
      limit,
      sortBy || 'timestamp',
      sortDirection,
    );

    return res.send({
      data: blocks,
    });
  } catch (error) {
    return res.status(500).send('Internal Error.');
  }
});
