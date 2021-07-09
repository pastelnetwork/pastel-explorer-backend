import express from 'express';

import { BlockEntity } from '../entity/block.entity';
import blockService from '../services/block.service';
import { calculateHashrate } from '../services/hashrate.service';
import transactionService from '../services/transaction.service';
import { TPeriod } from '../utils/period';

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
  const period = req.query.period as TPeriod;
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
      period,
    );

    return res.send({
      data: blocks,
    });
  } catch (error) {
    return res.status(500).send('Internal Error.');
  }
});
blockController.get('/chart/hashrate', async (req, res) => {
  const period = req.query.period;

  let from: number =
    Number(req.query.from) || (Date.now() - 24 * 60 * 60 * 1000) / 1000;

  let to: number = Number(req.query.to) || from + 24 * 60 * 60;
  let duration = 1;
  if (period) {
    switch (period) {
      case '1h':
        duration = 1;
        break;
      case '2h':
        duration = 2;
        break;
      case '6h':
        duration = 6;
        break;
      case '12h':
        duration = 12;
    }
    from = (new Date().getTime() - duration * 60 * 60 * 1000) / 1000;
    to = new Date().getTime() / 1000;
  } else if (from > 1000000000000 || to > 1000000000000) {
    return res.status(400).json({
      message: 'from and to parameters must be unix timestamp (10 digits)',
    });
  }

  try {
    const blocks = await blockService.findAllBetweenTimestamps(from, to);
    const hashrates = blocks.map(b => [
      b.timestamp,
      calculateHashrate(b.blockCountLastDay, Number(b.difficulty)),
    ]);
    return res.send({
      data: hashrates,
    });
  } catch (error) {
    return res.status(500).send('Internal Error.');
  }
});
