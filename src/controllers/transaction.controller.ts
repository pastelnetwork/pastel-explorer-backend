import express from 'express';

import { TransactionEntity } from '../entity/transaction.entity';
import addressEventsService from '../services/address-events.service';
import transactionService from '../services/transaction.service';
import { TGranularity, TPeriod } from '../utils/period';

export const transactionController = express.Router();

transactionController.get('/', async (req, res) => {
  const offset: number = Number(req.query.offset) || 0;
  const limit: number = Number(req.query.limit) || 10;
  const sortDirection = req.query.sortDirection === 'ASC' ? 'ASC' : 'DESC';
  const sortBy = req.query.sortBy as keyof TransactionEntity;
  const period = req.query.period as TPeriod;
  const sortByFields = [
    'timestamp',
    'totalAmount',
    'recipientCount',
    'blockHash',
  ];
  if (sortBy && !sortByFields.includes(sortBy)) {
    return res.status(400).json({
      message: `sortBy can be one of following: ${sortByFields.join(',')}`,
    });
  }
  if (typeof limit !== 'number' || limit < 0 || limit > 100) {
    return res.status(400).json({ message: 'limit must be between 0 and 100' });
  }

  try {
    const transactions = await transactionService.findAll(
      limit,
      offset,
      sortBy || 'timestamp',
      sortDirection,
      period,
    );

    return res.send({
      data: transactions.map(t => ({
        ...t,
        block: t.block || { confirmations: 0, height: 'N/A' },
      })),
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

transactionController.get('/chart/volume', async (req, res) => {
  const period = req.query.period as TPeriod;
  // let from: number =
  //   Number(req.query.from) || (Date.now() - 24 * 60 * 60 * 1000) / 1000;

  // let to: number = Number(req.query.to) || from + 24 * 60 * 60;

  // let duration = 0;
  // if (period) {
  //   switch (period) {
  //     case '30d':
  //       duration = 30;
  //       break;
  //     case '60d':
  //       duration = 60;
  //       break;
  //     case '180d':
  //       duration = 180;
  //       break;
  //     case '1y':
  //       duration = 365;
  //   }
  //   from =
  //     duration === 0
  //       ? 0
  //       : (new Date().getTime() - duration * 60 * 60 * 1000) / 1000;
  //   to = new Date().getTime() / 1000;
  // } else if (from > 1000000000000 || to > 1000000000000) {
  //   return res.status(400).json({
  //     message: 'from and to parameters must be unix timestamp (10 digits)',
  //   });
  // }
  try {
    // const transactions = await transactionService.findAllBetweenTimestamps(
    //   from,
    //   to,
    // );
    const transactions = await transactionService.getVolumeOfTransactions(
      period,
    );
    const dataSeries = transactions.map(t => [t.timestamp, t.sum]);
    // const dataX = [];
    // const dataY = [];
    // transactions.forEach(({ sum, timestamp }) => {
    //   dataX.push(timestamp);
    //   dataY.push(sum);
    // });
    return res.send({
      data: dataSeries,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

transactionController.get('/chart/latest', async (req, res) => {
  const from: number =
    Number(req.query.from) || (Date.now() - 2 * 60 * 60 * 1000) / 1000;

  if (from > 1000000000000) {
    return res.status(400).json({
      message: 'from parameter must be unix timestamp (10 digits)',
    });
  }
  try {
    const transactions = await transactionService.findFromTimestamp(from);

    const dataSeries = transactions.map(t => [t.timestamp, t.totalAmount]);

    return res.send({
      data: dataSeries,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

transactionController.get('/blocks-unconfirmed', async (_req, res) => {
  const transactions = await transactionService.getBlocksUnconfirmed();
  res.send({
    data: transactions,
  });
});

transactionController.get('/charts', async (req, res) => {
  const period = req.query.period as TPeriod;
  const granularity = req.query.granularity as TGranularity;
  const sql = req.query.sqlQuery as string;
  if (!sql) {
    return res.status(400).send({ error: 'Missing the sql parameter' });
  }
  try {
    console.log({ period, granularity });
    const data = await transactionService.getTransactionsInfo(
      sql,
      period,
      granularity,
    );
    console.log(data);
    return res.send({
      data,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

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
