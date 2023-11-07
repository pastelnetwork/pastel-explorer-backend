import express from 'express';

import blockService from '../services/block.service';
import masternodeService from '../services/masternode.service';
import statsMiningService from '../services/stats.mining.service';
import statsService from '../services/stats.service';
import transactionService from '../services/transaction.service';
import { Y } from '../utils/constants';
import { getTheNumberOfTotalSupernodes } from '../utils/helpers';
import {
  currentStatsData,
  validateCurrentStatsParamSchema,
} from '../utils/validator';

export const currentStatsController = express.Router();

const getPSLStaked = async () => {
  const currentSupernodeCount = await masternodeService.countFindAll();
  return currentSupernodeCount * getTheNumberOfTotalSupernodes();
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
      data = (await getCoinCirculatingSupply()).toString();
    } else if (q === currentStatsData.percent_psl_staked) {
      const pslStaked = await getPSLStaked();
      const coinCirculatingSupply = await getCoinCirculatingSupply();
      data = `${(pslStaked / (coinCirculatingSupply + pslStaked)) * 100}`;
    } else if (q === currentStatsData.coin_supply) {
      const totalBurnedPSL = await statsService.getLastTotalBurned();
      const currentStats = await statsService.getLatest();
      return res.send(`${currentStats[currentStatsData[q]] - totalBurnedPSL}`);
    } else if (q === currentStatsData.total_burned_psl) {
      const currentStats = await statsService.getLatest();
      return res.send(`${currentStats.totalBurnedPSL}`);
    } else if (q === currentStatsData.coins_created) {
      const currentStats = await statsService.getLatest();
      return res.send(`${currentStats.totalCoinSupply}`);
    } else if (q === currentStatsData.psl_locked_by_foundation) {
      return res.send(`${Y}`);
    } else {
      const currentStats = await statsService.getLatest();
      return res.send(`${currentStats[currentStatsData[q]]}`);
    }
    return res.send(`${data}`);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/current-stats/coins-created:
 *   get:
 *     summary: Get coins created
 *     tags: [The latest value of the statistics]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: 12216467949.280413
 *
 *       500:
 *         description: Internal Error.
 */
currentStatsController.get('/coins-created', async (req, res) => {
  try {
    const currentStats = await statsService.getLatest();
    return res.send(`${currentStats.totalCoinSupply}`);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/current-stats/psl-locked-by-foundation:
 *   get:
 *     summary: Get PSL locked by foundation
 *     tags: [The latest value of the statistics]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: 3004522800
 *       500:
 *         description: Internal Error.
 */
currentStatsController.get('/psl-locked-by-foundation', async (req, res) => {
  try {
    return res.send(`${Y}`);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/current-stats/total-burned-psl:
 *   get:
 *     summary: Get total burned PSL
 *     tags: [The latest value of the statistics]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: 773659.3999999998
 *       500:
 *         description: Internal Error.
 */
currentStatsController.get('/total-burned-psl', async (req, res) => {
  try {
    const currentStats = await statsService.getLatest();
    return res.send(`${currentStats.totalBurnedPSL}`);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/current-stats/coin-supply:
 *   get:
 *     summary: Get coin supply
 *     tags: [The latest value of the statistics]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: 12214920630.480413
 *       500:
 *         description: Internal Error.
 */
currentStatsController.get('/coin-supply', async (req, res) => {
  try {
    const totalBurnedPSL = await statsService.getLastTotalBurned();
    const currentStats = await statsService.getLatest();
    return res.send(`${currentStats.coinSupply - totalBurnedPSL}`);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/current-stats/percent-psl-staked:
 *   get:
 *     summary: Get percent PSL Staked
 *     tags: [The latest value of the statistics]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: 0.2822659422698204
 *       500:
 *         description: Internal Error.
 */
currentStatsController.get('/percent-psl-staked', async (req, res) => {
  try {
    const pslStaked = await getPSLStaked();
    const coinCirculatingSupply = await getCoinCirculatingSupply();
    return res.send(
      `${(pslStaked / (coinCirculatingSupply + pslStaked)) * 100}`,
    );
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/current-stats/coin-circulating-supply:
 *   get:
 *     summary: Get coin circulating supply
 *     tags: [The latest value of the statistics]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: 9185171489.880413
 *       500:
 *         description: Internal Error.
 */
currentStatsController.get('/coin-circulating-supply', async (req, res) => {
  try {
    const data = await getCoinCirculatingSupply();
    return res.send(`${data}`);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/current-stats/psl-staked:
 *   get:
 *     summary: Get PSL staked
 *     tags: [The latest value of the statistics]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: 26000000
 *       500:
 *         description: Internal Error.
 */
currentStatsController.get('/psl-staked', async (req, res) => {
  try {
    const data = await getPSLStaked();
    return res.send(`${data}`);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/current-stats/current-hash-rate:
 *   get:
 *     summary: Get current hash rate
 *     tags: [The latest value of the statistics]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: 125830
 *       500:
 *         description: Internal Error.
 */
currentStatsController.get('/current-hash-rate', async (req, res) => {
  try {
    const statsMining = await statsMiningService.getLatest();
    return res.send(`${statsMining.networksolps.toString()}`);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/current-stats/current-block-height:
 *   get:
 *     summary: Get current block height
 *     tags: [The latest value of the statistics]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: 233506
 *       500:
 *         description: Internal Error.
 */
currentStatsController.get('/current-block-height', async (req, res) => {
  try {
    const data = await blockService.getLastSavedBlock();
    return res.send(`${data}`);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/current-stats/current-supernode-count:
 *   get:
 *     summary: Get current supernode count
 *     tags: [The latest value of the statistics]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: 27
 *       500:
 *         description: Internal Error.
 */
currentStatsController.get('/current-supernode-count', async (req, res) => {
  try {
    const total = await masternodeService.countFindAll();
    return res.send(`${total}`);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/current-stats/giga-hash-per-second:
 *   get:
 *     summary: Get giga hash per second
 *     tags: [The latest value of the statistics]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: 20387.5628
 *       500:
 *         description: Internal Error.
 */
currentStatsController.get('/giga-hash-per-second', async (req, res) => {
  try {
    const currentStats = await statsService.getLatest();
    return res.send(`${currentStats.gigaHashPerSec}`);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/current-stats/accounts:
 *   get:
 *     summary: Get accounts
 *     tags: [The latest value of the statistics]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: 3250
 *       500:
 *         description: Internal Error.
 */
currentStatsController.get('/accounts', async (req, res) => {
  try {
    const currentStats = await statsService.getLatest();
    return res.send(`${currentStats.nonZeroAddressesCount}`);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/current-stats/avg-block-size:
 *   get:
 *     summary: Get average block size
 *     tags: [The latest value of the statistics]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: 2049.323024054983
 *       500:
 *         description: Internal Error.
 */
currentStatsController.get('/avg-block-size', async (req, res) => {
  try {
    const currentStats = await statsService.getLatest();
    return res.send(`${currentStats.avgBlockSizeLast24Hour}`);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/current-stats/avg-transaction-per-block:
 *   get:
 *     summary: Get avg transaction per block
 *     tags: [The latest value of the statistics]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: 1.6649484536082475
 *       500:
 *         description: Internal Error.
 */
currentStatsController.get('/avg-transaction-per-block', async (req, res) => {
  try {
    const currentStats = await statsService.getLatest();
    return res.send(`${currentStats.avgTransactionPerBlockLast24Hour}`);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/current-stats/usd-price:
 *   get:
 *     summary: Get usd price
 *     tags: [The latest value of the statistics]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: 1.6649484536082475
 *       500:
 *         description: Internal Error.
 */
currentStatsController.get('/usd-price', async (req, res) => {
  try {
    const currentStats = await statsService.getLatest();
    const serverName = process.env.EXPLORER_SERVER as string;
    return res.send(`${serverName !== 'Testnet' ? currentStats.usdPrice : 0}`);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/current-stats/total-transaction-count:
 *   get:
 *     summary: Get Total transaction count
 *     tags: [The latest value of the statistics]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: 523100
 *       500:
 *         description: Internal Error.
 */
currentStatsController.get('/total-transaction-count', async (req, res) => {
  try {
    const total = await transactionService.countAllTransaction();
    return res.send(`${total}`);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});
