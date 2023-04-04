import { BlockEntity } from 'entity/block.entity';
import express, { Request } from 'express';

import { updateBlockHash } from '../scripts/seed-blockchain-data/update-block-data';
import blockService from '../services/block.service';
import senseRequestsService from '../services/senserequests.service';
import ticketService from '../services/ticket.service';
import transactionService from '../services/transaction.service';
import { IQueryParameters } from '../types/query-request';
import { periodGroupByHourly, sortByBlocksFields } from '../utils/constants';
import { getStartDateByPeriod } from '../utils/period';
import {
  IQueryGrouDataSchema,
  queryWithSortSchema,
  validateQueryWithGroupData,
} from '../utils/validator';

export const blockController = express.Router();

/**
 * @swagger
 * /v1/blocks:
 *   get:
 *     summary: Block list
 *     tags: [Blocks]
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
 *         name: sortBy
 *         default: "timestamp"
 *         schema:
 *           type: string
 *           enum: ["id", "height", "transactionCount", "totalTickets", "timestamp"]
 *         required: false
 *       - in: query
 *         name: sortDirection
 *         default: "DESC"
 *         schema:
 *           type: string
 *           enum: ["ASC", "DESC"]
 *         required: false
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Blocks'
 *       400:
 *         description: Error messgae
 */
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
        startDate,
        endDate,
        excludePaging,
      } = queryWithSortSchema(sortByBlocksFields).validateSync(req.query);
      let newStartDate: number = startDate || 0;
      if (period) {
        newStartDate = getStartDateByPeriod(period);
      }
      const blocks = await blockService.getAll({
        offset,
        limit,
        orderBy: sortBy,
        orderDirection: sortDirection,
        types,
        startDate: newStartDate,
        endDate,
      });
      if (!excludePaging) {
        const total = await blockService.countGetAll({
          types,
          startDate: newStartDate,
          endDate,
        });
        return res.send({
          data: blocks,
          timestamp: new Date().getTime() / 1000,
          total: total,
        });
      }
      return res.send({
        data: blocks,
        timestamp: new Date().getTime() / 1000,
      });
    } catch (error) {
      return res.status(400).send({ error: error.message || error });
    }
  },
);

/**
 * @swagger
 * /v1/blocks/charts:
 *   get:
 *     summary: Get the data for the block charts in the historical statistics
 *     tags: [Blocks]
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
 *         default: "AVG"
 *         schema:
 *           type: string
 *           enum: ["AVG", "SUM"]
 *         required: true
 *       - in: query
 *         name: col
 *         default: "transactionCount"
 *         schema:
 *           type: string
 *           enum: ["transactionCount", "size"]
 *         required: true
 *     responses:
 *       200:
 *         description: object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlocksChart'
 *       400:
 *         description: Error message
 */
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

/**
 * @swagger
 * /v1/blocks/charts/size:
 *   get:
 *     summary: Get block size
 *     tags: [Blocks]
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
 *         description: object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlocksSize'
 *       400:
 *         description: Error message
 */
blockController.get(
  '/charts/size',
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

/**
 * @swagger
 * /v1/blocks/charts/statistics:
 *   get:
 *     summary: Get block statistics
 *     tags: [Blocks]
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
 *     responses:
 *       200:
 *         description: array
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlocksStatistics'
 *       400:
 *         description: Error message
 */
blockController.get(
  '/charts/statistics',
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

/**
 * @swagger
 * /v1/blocks/{id}:
 *   get:
 *     summary: Get block detail
 *     tags: [Blocks]
 *     parameters:
 *       - in: path
 *         name: id
 *         default: "0f069b5f548683bf9d45178ee4b3f721a91d60cbc694b4fcf7212b6f316b4ee5"
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlockDetail'
 *       400:
 *         description: id is required
 *       404:
 *         description: Block not found
 *       500:
 *         description: Internal Error
 */
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
