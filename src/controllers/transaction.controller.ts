import express, { Request } from 'express';

import { TransactionEntity } from '../entity/transaction.entity';
import addressEventsService from '../services/address-events.service';
import transactionService from '../services/transaction.service';
import { IQueryParameters } from '../types/query-request';
import {
  queryPeriodSchema,
  queryTransactionLatest,
  queryWithSortSchema,
  validateQueryWithGroupData,
} from '../utils/validator';

export const transactionController = express.Router();

transactionController.get('/', async (req, res) => {
  const sortByFields = [
    'timestamp',
    'totalAmount',
    'recipientCount',
    'blockHash',
  ];
  try {
    const { offset, limit, sortDirection, sortBy, period } =
      queryWithSortSchema(sortByFields).validateSync(req.query);
    const transactions = await transactionService.findAll(
      limit,
      offset,
      sortBy || 'timestamp',
      sortDirection || 'DESC',
      period,
    );

    return res.send({
      data: transactions.map(t => ({
        ...t,
        block: t.block || { confirmations: 0, height: 'N/A' },
      })),
    });
  } catch (error) {
    res.status(400).send({ error: error.message || error });
  }
});

transactionController.get('/chart/volume', async (req, res) => {
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
});

transactionController.get('/chart/latest', async (req, res) => {
  try {
    const { from } = queryTransactionLatest.validateSync(req.query);
    const transactions = await transactionService.findFromTimestamp(from);

    const dataSeries = transactions.map(t => [t.timestamp, t.totalAmount]);

    return res.send({
      data: dataSeries,
    });
  } catch (error) {
    res.status(400).send({ error: error.message || error });
  }
});

transactionController.get('/blocks-unconfirmed', async (_req, res) => {
  const transactions = await transactionService.getBlocksUnconfirmed();
  res.send({
    data: transactions,
  });
});

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
      const { period, granularity, func, col } =
        validateQueryWithGroupData.validateSync(req.query);
      const sqlQuery = `${func}(${col})`;
      const data = await transactionService.getTransactionsInfo(
        sqlQuery,
        period,
        granularity,
      );
      return res.send({
        data,
      });
    } catch (e) {
      return res.status(400).send({ error: e.message });
    }
  },
);

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

    return res.send({
      data: {
        ...transaction,
        transactionEvents,
        block: transaction.block || { confirmations: 0, height: 'N/A' },
        blockHash: transaction.blockHash || 'N/A',
      },
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});
