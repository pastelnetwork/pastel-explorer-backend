import { BlockEntity } from 'entity/block.entity';
import express, { Request } from 'express';

import { updateBlockHash } from '../scripts/seed-blockchain-data/update-block-data';
import blockService from '../services/block.service';
import { calculateHashrate } from '../services/hashrate.service';
import transactionService from '../services/transaction.service';
import { IQueryParameters } from '../types/query-request';
import { sortByBlocksFields } from '../utils/constants';
import { getStartPoint } from '../utils/period';
import {
  blockChartHashrateSchema,
  IQueryGrouDataSchema,
  queryWithSortSchema,
  TBlockChartHashrateSchema,
  validateQueryWithGroupData,
} from '../utils/validator';

export const blockController = express.Router();

blockController.get(
  '/',
  async (
    req: Request<unknown, unknown, unknown, IQueryParameters<BlockEntity>>,
    res,
  ) => {
    try {
      const {
        sortBy = 'timestamp',
        limit,
        offset,
        sortDirection = 'DESC',
        period,
      } = queryWithSortSchema(sortByBlocksFields).validateSync(req.query);
      const blocks = await blockService.getAll(
        offset,
        limit,
        sortBy,
        sortDirection,
        period,
      );

      return res.send({
        data: blocks,
        timestamp: new Date().getTime() / 1000,
      });
    } catch (error) {
      return res.status(400).send({ error: error.message || error });
    }
  },
);
// block hashrate
blockController.get('/chart/hashrate', async (req, res) => {
  try {
    const {
      from: fromTime,
      to: toTime,
      period,
    }: TBlockChartHashrateSchema = blockChartHashrateSchema.validateSync(
      req.query,
    );
    let from: number = fromTime || Date.now() - 24 * 60 * 60 * 1000;
    let to: number = toTime || from + 24 * 60 * 60 * 1000;
    if (period) {
      from = getStartPoint(period);
      to = new Date().getTime();
    }
    const blocks = await blockService.findAllBetweenTimestamps(from, to);
    const hashrates = blocks.map(b => [
      b.timestamp,
      calculateHashrate(b.blockCountLastDay, Number(b.difficulty)),
    ]);
    return res.send({
      data: hashrates,
    });
  } catch (error) {
    return res.status(400).send({ error: error.message || error });
  }
});

blockController.get(
  '/charts',
  async (
    req: Request<unknown, unknown, unknown, IQueryParameters<BlockEntity>>,
    res,
  ) => {
    try {
      const { period, granularity, func, col }: IQueryGrouDataSchema =
        validateQueryWithGroupData.validateSync(req.query);
      const sqlQuery = `${func}(${col})`;
      const data = await blockService.getBlocksInfo(
        sqlQuery,
        period,
        granularity,
      );

      return res.send({ data });
    } catch (e) {
      return res.status(400).send({ error: e.message || e });
    }
  },
);

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
    const block = await blockService.getHeightIdByHash(query);
    updateBlockHash(block.height - 1, query);
    res.status(500).send('Internal Error.');
  }
});
