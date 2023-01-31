import { BlockEntity } from 'entity/block.entity';
import express, { Request } from 'express';

import { updateBlockHash } from '../scripts/seed-blockchain-data/update-block-data';
import blockService from '../services/block.service';
import senseRequestsService from '../services/senserequests.service';
import ticketService from '../services/ticket.service';
import transactionService from '../services/transaction.service';
import { IQueryParameters } from '../types/query-request';
import { periodGroupByHourly, sortByBlocksFields } from '../utils/constants';
import {
  IQueryGrouDataSchema,
  queryWithSortSchema,
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
        types,
      } = queryWithSortSchema(sortByBlocksFields).validateSync(req.query);
      const blocks = await blockService.getAll(
        offset,
        limit,
        sortBy,
        sortDirection,
        period,
        types,
      );
      let total = 0;
      if (period) {
        total = await blockService.countGetAll(period, types);
      }

      return res.send({
        data: blocks,
        timestamp: new Date().getTime() / 1000,
        total: total,
      });
    } catch (error) {
      return res.status(400).send({ error: error.message || error });
    }
  },
);

blockController.get(
  '/charts',
  async (
    req: Request<unknown, unknown, unknown, IQueryParameters<BlockEntity>>,
    res,
  ) => {
    try {
      const { period, func, col, name, granularity }: IQueryGrouDataSchema =
        validateQueryWithGroupData.validateSync(req.query);
      const sqlQuery = `${func}(${col})`;

      if (name === 'blockchainSize') {
        const data = await blockService.getBlockchainSizeInfo(
          sqlQuery,
          period,
          'ASC',
          Number(req.query?.timestamp?.toString() || ''),
        );
        return res.send({
          data: data.items,
          startValue: data.startValue || 0,
          endValue: data.endValue,
        });
      } else {
        const data = await blockService.getBlocksInfo(
          sqlQuery,
          period,
          !granularity
            ? periodGroupByHourly.includes(period)
              ? '1d'
              : 'none'
            : granularity,
          'ASC',
          Number(req.query?.timestamp?.toString() || ''),
        );
        return res.send({ data });
      }
    } catch (e) {
      return res.status(400).send({ error: e.message || e });
    }
  },
);

blockController.get(
  '/size',
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
      const blocks = await blockService.getAllBlockSize(
        offset,
        limit,
        sortBy,
        sortDirection,
        period,
      );

      return res.send({
        data: blocks,
      });
    } catch (error) {
      return res.status(400).send({ error: error.message || error });
    }
  },
);

blockController.get(
  '/statistics',
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
      const blocks = await blockService.getAllBlockForStatistics(
        offset,
        limit,
        sortBy,
        sortDirection,
        period,
      );

      return res.send({
        data: blocks,
      });
    } catch (error) {
      return res.status(400).send({ error: error.message || error });
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
  const fetchData = async () => {
    const block = await blockService.getBlockByIdOrHeight(query);
    if (!block) {
      return res.status(404).json({
        message: 'Block not found',
      });
    }
    const transactions = await transactionService.getAllTransactionByBlockHash(
      block.id,
    );
    const tickets = await ticketService.getTicketsInBlock(block.height);
    const senses = await senseRequestsService.getSenseListByBlockHash(block.id);

    return res.send({
      data: { ...block, transactions, tickets, senses },
    });
  };
  try {
    await fetchData();
  } catch (error) {
    const block = await blockService.getHeightIdByPreviousBlockHash(query);
    if (block?.height) {
      await updateBlockHash(block.height - 1, query);
    }
    try {
      await fetchData();
    } catch (error) {
      res.status(500).send('Internal Error.');
    }
  }
});
