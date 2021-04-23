import express from 'express';

import statsService from '../services/stats.service';

export const statsController = express.Router();

statsController.get('/', async (req, res) => {
  try {
    const currentStats = await statsService.getLatest();
    const lastDayStats = await statsService.getDayAgo();
    return res.send({
      currentStats,
      lastDayStats,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});
