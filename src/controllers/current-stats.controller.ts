import express from 'express';

import addressEventsService from '../services/address-events.service';
import blockService from '../services/block.service';
import masternodeService from '../services/masternode.service';
import statsMiningService from '../services/stats.mining.service';
import statsService from '../services/stats.service';
import transactionService from '../services/transaction.service';
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
  const stats = await statsService.getSummaryChartData();
  const coinSupply = stats.coinSupply[stats.coinSupply.length - 1].value;
  const pslStaked = await getPSLStaked();
  return (
    coinSupply -
    pslStaked -
    stats.lessPSLLockedByFoundationData[
      stats.lessPSLLockedByFoundationData.length - 1
    ].value
  );
};

currentStatsController.get('/', async (req, res) => {
  try {
    const { q } = validateCurrentStatsParamSchema.validateSync(req.query);
    if (q === currentStatsData.current_supernode_count) {
      const data = await masternodeService.countFindAll();
      return res.send(`${data}`);
    } else if (q === currentStatsData.current_blockheight) {
      const data = (await blockService.getLastSavedBlock()).toString();
      return res.send(`${data}`);
    } else if (q === currentStatsData.current_hash_rate) {
      const statsMining = await statsMiningService.getLatest();
      const data = statsMining.networksolps.toString();
      return res.send(`${data}`);
    } else if (q === currentStatsData.psl_staked) {
      const data = (await getPSLStaked()).toString();
      return res.send(`${data}`);
    } else if (q === currentStatsData.coin_circulating_supply) {
      const data = (await getCoinCirculatingSupply()).toString();
      return res.send(`${data}`);
    } else if (q === currentStatsData.percent_psl_staked) {
      const pslStaked = await getPSLStaked();
      const coinCirculatingSupply = await getCoinCirculatingSupply();
      const data = `${(pslStaked / (coinCirculatingSupply + pslStaked)) * 100}`;
      return res.send(`${data}`);
    } else if (q === currentStatsData.coinSupply) {
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
      const lessPSLLockedByFoundation =
        await statsService.getLessPSLLockedByFoundation();
      return res.send(`${lessPSLLockedByFoundation}`);
    } else if (q === currentStatsData.total_transaction_count) {
      const total = await transactionService.countAllTransaction();
      return res.send(`${total}`);
    }
    return res.status(404).send('Not found.');
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
    const stats = await statsService.getSummaryChartData();
    if (stats.totalCoinSupplyData.length) {
      return res.send(
        `${stats.totalCoinSupplyData[stats.totalCoinSupplyData.length - 1].value}`,
      );
    }
    return res.send('0');
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
    const stats = await statsService.getSummaryChartData();
    return res.send(
      `${stats.lessPSLLockedByFoundationData[stats.lessPSLLockedByFoundationData.length - 1].value}`,
    );
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
    const stats = await statsService.getSummaryChartData();
    return res.send(
      `${stats.totalBurnedPSLData[stats.totalBurnedPSLData.length - 1].value}`,
    );
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
    const stats = await statsService.getSummaryChartData();
    return res.send(`${stats.coinSupply[stats.coinSupply.length - 1].value}`);
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
    const stats = await statsService.getSummaryChartData();
    return res.send(
      `${stats.gigaHashPerSec[stats.gigaHashPerSec.length - 1].value}`,
    );
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
    const stats = await statsService.getSummaryChartData();
    return res.send(
      `${stats.nonZeroAddressesCount[stats.nonZeroAddressesCount.length - 1].value}`,
    );
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
    const stats = await statsService.getSummaryChartData();
    return res.send(
      `${stats.avgBlockSizeLast24Hour[stats.avgBlockSizeLast24Hour.length - 1].value}`,
    );
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
    const stats = await statsService.getSummaryChartData();
    return res.send(
      `${stats.avgTransactionPerBlockLast24Hour[stats.avgTransactionPerBlockLast24Hour.length].value}`,
    );
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
    return res.send(`${serverName !== 'Testnet' ? currentStats?.usdPrice : 0}`);
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

/**
 * @swagger
 * /v1/current-stats/total-distributed-psl-to-supernodes:
 *   get:
 *     summary: Get Total Distributed PSL to supernodes
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
currentStatsController.get(
  '/total-distributed-psl-to-supernodes',
  async (req, res) => {
    try {
      const currentBlockHeight = await blockService.getLastSavedBlock();
      const value = 1250 * (Number(currentBlockHeight) - 1000);
      return res.send(`${value}`);
    } catch (error) {
      res.status(500).send('Internal Error.');
    }
  },
);

/**
 * @swagger
 * /v1/current-stats/total-psl:
 *   post:
 *     summary: Get total PSL
 *     tags: [The latest value of the statistics]
 *     requestBody:
 *      name: psl_address
 *      default: ["tPdEXG67WRZeg6mWiuriYUGjLn5hb8TKevb"]
 *      content:
 *         application/json:
 *            schema:
 *              type: array
 *              items:
 *                type: string
 *      required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PslAddress'
 *       500:
 *         description: Internal Error.
 */
currentStatsController.post('/total-psl', async (req, res) => {
  try {
    const address: string[] = req.body.psl_address;
    if (!address?.length) {
      return res.status(400).json({
        message: 'PSL address is required',
      });
    }
    const addresses = await addressEventsService.getTotalPSLByAddress(address);
    return res.send(addresses);
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});
