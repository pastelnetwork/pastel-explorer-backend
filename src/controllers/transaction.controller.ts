import express from 'express';

import { TransactionEntity } from '../entity/transaction.entity';
import addressEventsService from '../services/address-events.service';
import transactionService from '../services/transaction.service';

export const transactionController = express.Router();

transactionController.get('/:id', async (req, res) => {
  const id: string = req.params.id;
  if (!id) {
    return res.status(400).json({
      message: 'id is required',
    });
  }
  try {
    const transaction = await transactionService.findOneById(id);
    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction not found',
      });
    }
    const transactionEvents = await addressEventsService.findAllByTransactionHash(
      transaction.id,
    );

    return res.send({
      data: { ...transaction, transactionEvents },
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

transactionController.get('/', async (req, res) => {
  const offset: number = Number(req.query.offset) || 0;
  const limit: number = Number(req.query.limit) || 10;
  const sortDirection = req.query.sortDirection === 'ASC' ? 'ASC' : 'DESC';
  const sortBy = req.query.sortBy as keyof TransactionEntity;
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
      sortBy,
      sortDirection,
    );

    return res.send({
      data: transactions,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});
