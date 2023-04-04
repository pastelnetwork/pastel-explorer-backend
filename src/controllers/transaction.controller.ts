import express, { Request } from 'express';

import { TransactionEntity } from '../entity/transaction.entity';
import addressEventsService from '../services/address-events.service';
import senseRequestsService from '../services/senserequests.service';
import ticketService from '../services/ticket.service';
import transactionService from '../services/transaction.service';
import { IQueryParameters } from '../types/query-request';
import { sortByTransactionsFields } from '../utils/constants';
import { getStartDateByPeriod, TPeriod } from '../utils/period';
import {
  queryPeriodSchema,
  queryTransactionLatest,
  queryWithSortSchema,
  validateQueryWithGroupData,
} from '../utils/validator';

export const transactionController = express.Router();

/**
 * @swagger
 * /v1/transactions:
 *   get:
 *     summary: Transaction List
 *     tags: [Transactions]
 *     parameters:
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
 *           enum: ["blockHash", "recipientCount", "totalAmount", "ticketsTotal", "timestamp"]
 *         required: false
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transactions'
 *       400:
 *         description: Error message
 */
transactionController.get('/', async (req, res) => {
  try {
    const {
      offset,
      limit,
      sortDirection,
      sortBy,
      startDate,
      endDate,
      period,
      excludePaging,
    } = queryWithSortSchema(sortByTransactionsFields).validateSync(req.query);

    let newStartDate: number = startDate || 0;
    if (period) {
      newStartDate = getStartDateByPeriod(period);
    }
    const transactions = await transactionService.findAll({
      limit,
      offset,
      orderBy: sortBy || 'timestamp',
      orderDirection: sortDirection || 'DESC',
      startDate: newStartDate,
      endDate,
    });
    if (!excludePaging) {
      const total = await transactionService.countFindAll(
        newStartDate,
        endDate,
      );
      return res.send({
        data: transactions.map(t => ({
          ...t,
          block: t.block || { confirmations: 0, height: 'N/A' },
        })),
        total: total,
      });
    }
    return res.send({
      data: transactions.map(t => ({
        ...t,
        block: t.block || { confirmations: 0, height: 'N/A' },
      })),
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({ error: error.message || error });
  }
});

/**
 * @swagger
 * /v1/transactions/charts/volume-of-transactions:
 *   get:
 *     summary: Get volume of transactions
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "12h"
 *         schema:
 *           type: string
 *           enum: ["1h", "3h", "6h", "12h"]
 *         required: true
 *     responses:
 *       200:
 *         description: Data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VolumeChartData'
 *       400:
 *         description: Error message
 */
transactionController.get(
  '/charts/volume-of-transactions',
  async (req, res) => {
    try {
      const { period } = queryPeriodSchema.validateSync(req.query);
      const transactions = await transactionService.getVolumeOfTransactions(
        period,
      );
      const dataSeries = transactions.map(t => [t.timestamp, t.sum]);
      return res.send({
        data: dataSeries,
      });
    } catch (error) {
      res.status(400).send({ error: error.message || error });
    }
  },
);

/**
 * @swagger
 * /v1/transactions/charts/incoming-transactions:
 *   get:
 *     summary: Get incoming transactions
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "12h"
 *         schema:
 *           type: string
 *           enum: ["1h", "3h", "6h", "12h"]
 *         required: true
 *     responses:
 *       200:
 *         description: Data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VolumeChartData'
 *       400:
 *         description: Error message
 */
transactionController.get('/charts/incoming-transactions', async (req, res) => {
  try {
    const { period } = queryTransactionLatest.validateSync(req.query);
    const transactions = await transactionService.findFromTimestamp(
      period as TPeriod,
    );

    const dataSeries = transactions.map(t => [
      t.timestamp / 1000,
      t.totalAmount,
    ]);

    return res.send({
      data: dataSeries,
    });
  } catch (error) {
    res.status(400).send({ error: error.message || error });
  }
});

/**
 * @swagger
 * /v1/transactions/blocks-unconfirmed:
 *   get:
 *     summary: Get unconfirmed blocks
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: Data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlocksUnconfirmed'
 */
transactionController.get('/blocks-unconfirmed', async (_req, res) => {
  const transactions = await transactionService.getBlocksUnconfirmed();
  res.send({
    data: transactions,
  });
});

/**
 * @swagger
 * /v1/transactions/charts:
 *   get:
 *     summary: Get the data for the Transaction charts in the historical statistics
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: period
 *         default: "30d"
 *         schema:
 *           type: string
 *           enum: ["24h", "7d", "14d", "30d", "90d", "180d", "1y", "max"]
 *         required: true
 *       - in: query
 *         name: func
 *         default: "COUNT"
 *         schema:
 *           type: string
 *           enum: ["COUNT", "SUM", "AVG"]
 *         required: true
 *       - in: query
 *         name: col
 *         default: "id"
 *         schema:
 *           type: string
 *           enum: ["id", "fee"]
 *         required: true
 *     responses:
 *       200:
 *         description: Data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionsChartsData'
 *       400:
 *         description: Error message
 */
transactionController.get(
  '/charts',
  async (
    req: Request<
      unknown,
      unknown,
      unknown,
      IQueryParameters<TransactionEntity>
    >,
    res,
  ) => {
    try {
      const { period, func, col } = validateQueryWithGroupData.validateSync(
        req.query,
      );
      const sqlQuery = `${func}(${col})`;
      const startTime = Number(req.query?.timestamp?.toString() || '');
      const data = await transactionService.getTransactionsInfo(
        sqlQuery,
        period,
        'ASC',
        startTime,
        req.query.groupBy,
        req.query.startValue,
      );
      return res.send({
        data: data.items,
        startValue: data.startValue,
        endValue: data.endValue,
      });
    } catch (e) {
      return res.status(400).send({ error: e.message });
    }
  },
);

/**
 * @swagger
 * /v1/transactions/{id}:
 *   get:
 *     summary: Get transaction detail
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         default: "0c12b040e061ac7cc427dfb0b15c4f8619de315c84285981d550a54e5a80324b"
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/TransactionDetails'
 *       400:
 *         description: id is required
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Internal Error.
 */
transactionController.get('/:id', async (req, res) => {
  const id: string = req.params.id;
  if (!id) {
    return res.status(400).json({
      message: 'id is required',
    });
  }
  try {
    const transaction = await transactionService.findOneById(id);
    const parseUnconfirmedTransactionDetails = (trx: TransactionEntity) => {
      try {
        const parsedDetails = JSON.parse(trx.unconfirmedTransactionDetails);
        return parsedDetails?.addressEvents || [];
      } catch (e) {
        return [];
      }
    };
    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction not found',
      });
    }
    const transactionEvents = transaction.block
      ? await addressEventsService.findAllByTransactionHash(transaction.id)
      : parseUnconfirmedTransactionDetails(transaction);

    const tickets = await ticketService.getTicketsByTxId(id);
    const senseData =
      await senseRequestsService.getSenseListForTransactionDetails(id);

    return res.send({
      data: {
        ...transaction,
        transactionEvents,
        block: transaction.block || { confirmations: 0, height: 'N/A' },
        blockHash: transaction.blockHash || 'N/A',
        ticketsList: tickets,
        senseData,
      },
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});
