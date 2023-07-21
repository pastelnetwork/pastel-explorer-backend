import express from 'express';

import { TransactionEntity } from '../entity/transaction.entity';
import addressService from '../services/address.service';
import addressEventsService from '../services/address-events.service';
import senseRequestsService from '../services/senserequests.service';
import ticketService from '../services/ticket.service';
import transactionService from '../services/transaction.service';
import { sortByTransactionsFields } from '../utils/constants';
import { getStartDateByPeriod } from '../utils/period';
import { queryWithSortSchema } from '../utils/validator';

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
      limit: limit || 10,
      offset: offset || 0,
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
 * /v1/transactions/mempool:
 *   get:
 *     summary: Mempool List
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: limit
 *         default: 5
 *         schema:
 *           type: number
 *         required: true
 *       - in: query
 *         name: offset
 *         default: 0
 *         schema:
 *           type: number
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mempools'
 *       400:
 *         description: Error message
 */
transactionController.get('/mempool', async (req, res) => {
  try {
    const { offset, limit } = req.query;
    const transactions =
      await transactionService.getAllTransactionOfBlocksUnconfirmed(
        Number(offset) || 0,
        Number(limit) || 10,
      );
    const total =
      await transactionService.countTransactionOfBlocksUnconfirmed();
    return res.send({ data: transactions, total });
  } catch (error) {
    console.log(error);
    res.status(400).send({ error: error.message || error });
  }
});

/**
 * @swagger
 * /v1/transactions/{txid}:
 *   get:
 *     summary: Get transaction detail
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: txid
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
 *         description: txid is required
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Internal Error.
 */
transactionController.get('/:txid', async (req, res) => {
  const id: string = req.params.txid;
  if (!id) {
    return res.status(400).json({
      message: 'txid is required',
    });
  }
  try {
    const transaction = await transactionService.findOneById(id);
    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction not found',
      });
    }
    const parseUnconfirmedTransactionDetails = (trx: TransactionEntity) => {
      try {
        const parsedDetails = JSON.parse(trx.unconfirmedTransactionDetails);
        return parsedDetails?.addressEvents || [];
      } catch (e) {
        return [];
      }
    };
    const transactionEvents = transaction.block
      ? await addressEventsService.findAllByTransactionHash(transaction.id)
      : parseUnconfirmedTransactionDetails(transaction);

    const tickets = await ticketService.getTicketsByTxId(id);
    const senseData =
      await senseRequestsService.getSenseListForTransactionDetails(id);
    const addresses = transactionEvents?.map(t => t.address);
    let addressList = [];
    if (addresses?.length) {
      addressList = await addressService.getAddressByAddresses(addresses);
    }
    return res.send({
      data: {
        ...transaction,
        transactionEvents: transactionEvents?.map(t => {
          const address = addressList.find(a => a.address === t.address);
          return {
            ...t,
            type: address?.type || '',
          };
        }),
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
