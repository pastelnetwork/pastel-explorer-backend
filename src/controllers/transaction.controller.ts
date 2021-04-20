import express from 'express';

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

  if (typeof limit !== 'number' || limit < 0 || limit > 100) {
    return res.status(400).json({ message: 'limit must be between 0 and 100' });
  }

  try {
    const transactions = await transactionService.findAll(
      limit,
      offset,
      'timestamp',
      'DESC',
    );

    return res.send({
      data: transactions,
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});
