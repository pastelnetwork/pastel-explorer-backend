import express from 'express';

import addressEventsService from '../services/address-events.service';
import blockService from '../services/block.service';
import masternodeService from '../services/masternode.service';
import statsMiningService from '../services/stats.mining.service';
import statsService from '../services/stats.service';
import { fiveMillion, Y } from '../utils/constants';
import {
  currentStatsData,
  validateCurrentStatsParamSchema,
} from '../utils/validator';

export const currentStatsController = express.Router();

const getPSLStaked = async () => {
  const currentSupernodeCount = await masternodeService.countFindAll();
  return currentSupernodeCount * fiveMillion;
};

const getCoinCirculatingSupply = async () => {
  const coinSupply = await statsService.getCoinSupply();
  const pslStaked = await getPSLStaked();
  return coinSupply - pslStaked - Y;
};

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
    } else if (q === currentStatsData.psl_staked) {
      data = (await getPSLStaked()).toString();
    } else if (q === currentStatsData.coin_circulating_supply) {
      const incomingSum = await addressEventsService.sumAllEventsAmount(
        process.env.PASTEL_BURN_ADDRESS,
        'Incoming' as TransferDirectionEnum,
      );
      data = ((await getCoinCirculatingSupply()) - incomingSum).toString();
    } else if (q === currentStatsData.percent_psl_staked) {
      const pslStaked = await getPSLStaked();
      const coinCirculatingSupply = await getCoinCirculatingSupply();
      data = `${(pslStaked / (coinCirculatingSupply + pslStaked)) * 100}`;
    } else if (q === currentStatsData.coin_supply) {
      const incomingSum = await addressEventsService.sumAllEventsAmount(
        process.env.PASTEL_BURN_ADDRESS,
        'Incoming' as TransferDirectionEnum,
      );
      const totalBurnedPSL = await statsService.getLastTotalBurned();
      const currentStats = await statsService.getLatest();
      return res.send(
        `${currentStats[currentStatsData[q]] - totalBurnedPSL - incomingSum}`,
      );
    } else if (q === currentStatsData.total_burned_psl) {
      const currentStats = await statsService.getLatest();
      return res.send(`${currentStats.totalBurnedPSL}`);
    } else {
      const currentStats = await statsService.getLatest();
      return res.send(`${currentStats[currentStatsData[q]]}`);
    }
    return res.send(`${data}`);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});
