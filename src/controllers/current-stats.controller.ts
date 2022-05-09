import express from 'express';

import blockService from '../services/block.service';
import masternodeService from '../services/masternode.service';
import statsMiningService from '../services/stats.mining.service';
import statsService from '../services/stats.service';
import {
  currentStatsData,
  validateCurrentStatsParamSchema,
} from '../utils/validator';

export const currentStatsController = express.Router();

currentStatsController.get('/', async (req, res) => {
  try {
    const { q } = validateCurrentStatsParamSchema.validateSync(req.query);
    let data = '';
    if (q === currentStatsData.current_supernode_count) {
      data = await masternodeService.countFindAll();
    } else if (q === currentStatsData.current_blockheight) {
      data = (await blockService.getLastSavedBlock()).toString();
    } else if (q === currentStatsData.current_hash_rate) {
      const statsMining = await statsMiningService.getLatest();
      data = statsMining.networksolps.toString();
    } else {
      const currentStats = await statsService.getLatest();
      return res.send(`${currentStats[currentStatsData[q]]}`);
    }
    return res.send(`${data}`);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});
