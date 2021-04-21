import express from 'express';

import { BlockEntity } from '../entity/block.entity';
import blockService from '../services/block.service';
import transactionService from '../services/transaction.service';

export const blockController = express.Router();

blockController.get('/:id', async (req, res) => {
  const query: string = req.params.id;
  if (!query) {
    return res.status(400).json({
      message: 'id is required',
    });
  }
  try {
    const block = await blockService.getOneByIdOrHeight(query);
    if (!block) {
      return res.status(404).json({
        message: 'Block not found',
      });
    }
    const transactions = await transactionService.getAllByBlockHash(block.id);

    return res.send({
      data: { ...block, transactions },
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

blockController.get('/', async (req, res) => {
  const offset: number = Number(req.query.offset) || 0;
  const limit: number = Number(req.query.limit) || 10;
  const sortDirection = req.query.sortDirection === 'ASC' ? 'ASC' : 'DESC';
  const sortBy = req.query.sortBy as keyof BlockEntity;
  const sortByFields = [
    'id',
    'timestamp',
    'difficulty',
    'size',
    'transactionCount',
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
    const blocks = await blockService.getAll(
      offset,
      limit,
      sortBy || 'timestamp',
      sortDirection,
    );

    return res.send({
      data: blocks,
    });
  } catch (error) {
    return res.status(500).send('Internal Error.');
  }
});
