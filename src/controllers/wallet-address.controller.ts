import { AddressEventEntity } from 'entity/address-event.entity';
import express from 'express';

import accountRankService from '../services/account-rank.service';
import addressEventsService from '../services/address-events.service';
import { TPeriod } from '../utils/period';

export const walletAddressController = express.Router();

// /**
//  * @swagger
//  * /v1/addresses/direction/{id}:
//  *   get:
//  *     summary: Get Received Or Sent by Month
//  *     tags: [Addresses]
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         schema:
//  *           type: string
//  *         required: true
//  *         description: The address
//  *       - in: query
//  *         name: period
//  *         schema:
//  *           type: string
//  *         required: true
//  *         description: The period
//  *       - in: query
//  *         name: direction
//  *         schema:
//  *           type: string
//  *         required: true
//  *         description: Incoming or Outgoing
//  *     responses:
//  *       200:
//  *         description: Data
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *       400:
//  *         description: id (address) is required
//  *       500:
//  *         description: Internal Error.
// */
walletAddressController.get('/direction/:id', async (req, res) => {
  try {
    const { period, direction } = req.query;
    const id: string = req.params.id;
    if (!id) {
      return res.status(400).json({
        message: 'id (address) is required',
      });
    }

    const data = await addressEventsService.getDirection(
      id.toString() || '',
      period as TPeriod,
      direction as TransferDirectionEnum,
    );
    return res.send(data);
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Error.');
  }
});

// /**
//  * @swagger
//  * /v1/addresses/balance-history/{id}:
//  *   get:
//  *     summary: Get balance history
//  *     tags: [Addresses]
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         schema:
//  *           type: string
//  *         required: true
//  *         description: The address
//  *       - in: query
//  *         name: period
//  *         schema:
//  *           type: string
//  *         required: true
//  *         description: The period
//  *     responses:
//  *       200:
//  *         description: Data
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *       400:
//  *         description: id (address) is required
//  *       500:
//  *         description: Internal Error.
// */
walletAddressController.get('/balance-history/:id', async (req, res) => {
  try {
    const { period } = req.query;
    const id: string = req.params.id;
    if (!id) {
      return res.status(400).json({
        message: 'id (address) is required',
      });
    }

    const data = await addressEventsService.getBalanceHistory(
      id?.toString() || '',
      period as TPeriod,
    );
    return res.send(data);
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Error.');
  }
});

// /**
//  * @swagger
//  * /v1/addresses/latest-transactions/{id}:
//  *   get:
//  *     summary: Get latest transactions
//  *     tags: [Addresses]
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         schema:
//  *           type: string
//  *         required: true
//  *         description: The address
//  *       - in: query
//  *         name: offset
//  *         schema:
//  *           type: number
//  *         required: false
//  *         description: The offset
//  *       - in: query
//  *         name: limit
//  *         schema:
//  *           type: number
//  *         required: false
//  *         description: The limit
//  *       - in: query
//  *         name: sortDirection
//  *         schema:
//  *           type: string
//  *         required: false
//  *         description: ASC or DESC
//  *       - in: query
//  *         name: sortBy
//  *         schema:
//  *           type: string
//  *         required: false
//  *         description: The sortBy
//  *     responses:
//  *       200:
//  *         description: Data
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *       400:
//  *         description: Message error
//  *       500:
//  *         description: Internal Error.
// */
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
 *     summary: Get all events on particular wallet address
 *     tags: [Addresses]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: id (address) is required
 *       404:
 *         description: address not found
 *       500:
 *         description: Internal Error.
 */
walletAddressController.get('/:id', async (req, res) => {
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
 *     summary: Get top 100 addresses rank (by balance)
 *     tags: [Addresses]
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
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
