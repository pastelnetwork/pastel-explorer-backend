import { AddressEventEntity } from 'entity/address-event.entity';
import express from 'express';

import accountRankService from '../services/account-rank.service';
import addressEventsService from '../services/address-events.service';

export const walletAddressController = express.Router();

/**
 * @swagger
 * /v1/addresses/latest-transactions/{id}:
 *   get:
 *     summary: Get latest transactions of an address
 *     tags: [Addresses]
 *     parameters:
 *       - in: path
 *         name: id
 *         default: "tPdEXG67WRZeg6mWiuriYUGjLn5hb8TKevb"
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: limit
 *         default: 10
 *         schema:
 *           type: number
 *         required: true
 *       - in: query
 *         name: offset
 *         default: 0
 *         schema:
 *           type: number
 *         required: true
 *       - in: query
 *         name: sortDirection
 *         type: string
 *         default: "DESC"
 *         schema:
 *           type: string
 *           enum: ["ASC", "DESC"]
 *         required: false
 *       - in: query
 *         name: sortBy
 *         default: "timestamp"
 *         schema:
 *           type: string
 *           enum: ["transactionHash", "amount", "direction", "timestamp"]
 *         required: false
 *     responses:
 *       200:
 *         description: Data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LatestTransactions'
 *       400:
 *         description: Message error
 *       500:
 *         description: Internal Error.
 */
walletAddressController.get('/latest-transactions/:id', async (req, res) => {
  try {
    const address: string = req.params.id;
    if (!address) {
      return res.status(400).json({
        message: 'id (address) is required',
      });
    }
    const offset: number = Number(req.query.offset) || 0;
    const limit: number = Number(req.query.limit) || 10;
    const sortDirection = req.query.sortDirection === 'ASC' ? 'ASC' : 'DESC';
    const sortBy = req.query.sortBy as keyof AddressEventEntity;
    const sortByFields = [
      'direction',
      'transactionHash',
      'amount',
      'direction',
      'timestamp',
    ];
    if (sortBy && !sortByFields.includes(sortBy)) {
      return res.status(400).json({
        message: `sortBy can be one of following: ${sortByFields.join(',')}`,
      });
    }
    if (typeof limit !== 'number' || limit < 0 || limit > 100) {
      return res
        .status(400)
        .json({ message: 'limit must be between 0 and 100' });
    }

    const addressEvents = await addressEventsService.findAllByAddress({
      address,
      limit,
      offset,
      orderBy: sortBy || 'timestamp',
      orderDirection: sortDirection,
    });

    return res.send({ data: addressEvents });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/addresses/{id}:
 *   get:
 *     summary: Get address detail
 *     tags: [Addresses]
 *     parameters:
 *       - in: path
 *         name: id
 *         default: "tPdEXG67WRZeg6mWiuriYUGjLn5hb8TKevb"
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *         required: false
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: false
 *       - in: query
 *         name: sortDirection
 *         default: "DESC"
 *         schema:
 *           type: string
 *           enum: ["ASC", "DESC"]
 *         required: false
 *       - in: query
 *         name: sortBy
 *         default: "timestamp"
 *         schema:
 *           type: string
 *           enum: ["direction", "transactionHash", "amount", "timestamp"]
 *         required: false
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *              $ref: '#/components/schemas/AddressDetails'
 *       400:
 *         description: id (address) is required
 *       404:
 *         description: address not found
 *       500:
 *         description: Internal Error.
 */
walletAddressController.get('/:id', async (req, res) => {
  const offset: number = Number(req.query.offset) || 0;
  const limit: number = Number(req.query.limit) || 10;
  const sortDirection = req.query.sortDirection === 'ASC' ? 'ASC' : 'DESC';
  const sortBy = req.query.sortBy as keyof AddressEventEntity;
  const sortByFields = ['direction', 'transactionHash', 'amount', 'timestamp'];
  if (sortBy && !sortByFields.includes(sortBy)) {
    return res.status(400).json({
      message: `sortBy can be one of following: ${sortByFields.join(',')}`,
    });
  }
  if (typeof limit !== 'number' || limit < 0 || limit > 100) {
    return res.status(400).json({ message: 'limit must be between 0 and 100' });
  }
  const address: string = req.params.id;
  if (!address) {
    return res.status(400).json({
      message: 'id (address) is required',
    });
  }
  try {
    const incomingSum = await addressEventsService.sumAllEventsAmount(
      address,
      'Incoming' as TransferDirectionEnum,
    );
    if (!incomingSum) {
      return res.status(404).json({
        message: 'address not found',
      });
    }
    const outgoingSum = await addressEventsService.sumAllEventsAmount(
      address,
      'Outgoing' as TransferDirectionEnum,
    );

    const addressEvents = await addressEventsService.findAllByAddress({
      address,
      limit,
      offset,
      orderBy: sortBy || 'timestamp',
      orderDirection: sortDirection,
    });

    return res.send({
      data: addressEvents,
      incomingSum,
      outgoingSum,
      address: address,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/addresses/balance/{id}:
 *   get:
 *     summary: Get current balance of an address
 *     tags: [Addresses]
 *     parameters:
 *       - in: path
 *         name: id
 *         default: "tPdEXG67WRZeg6mWiuriYUGjLn5hb8TKevb"
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *              $ref: '#/components/schemas/Balance'
 *       400:
 *         description: id (address) is required
 *       404:
 *         description: address not found
 *       500:
 *         description: Internal Error.
 */
walletAddressController.get('/balance/:id', async (req, res) => {
  const address: string = req.params.id;
  if (!address) {
    return res.status(400).json({
      message: 'id (address) is required',
    });
  }
  try {
    const incomingSum = await addressEventsService.sumAllEventsAmount(
      address,
      'Incoming' as TransferDirectionEnum,
    );
    if (!incomingSum) {
      return res.status(404).json({
        message: 'address not found',
      });
    }
    const outgoingSum = await addressEventsService.sumAllEventsAmount(
      address,
      'Outgoing' as TransferDirectionEnum,
    );

    return res.send({
      incomingSum,
      outgoingSum,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/addresses/rank/100:
 *   get:
 *     summary: Top 100
 *     tags: [Addresses]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Rank100'
 *       500:
 *         description: Internal Error.
 */
walletAddressController.get('/rank/100', async (req, res) => {
  try {
    const rank = await accountRankService.getTopBalanceRank();
    return res.send({
      data: rank,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});
