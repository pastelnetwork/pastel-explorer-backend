import { BlockEntity } from 'entity/block.entity';
import express, { Request } from 'express';

import { updateBlockHash } from '../scripts/seed-blockchain-data/update-block-data';
import addressEventsService from '../services/address-events.service';
import blockService from '../services/block.service';
import senseRequestsService from '../services/senserequests.service';
import ticketService from '../services/ticket.service';
import transactionService from '../services/transaction.service';
import { IQueryParameters } from '../types/query-request';
import { sortByBlocksFields } from '../utils/constants';
import { getStartDateByPeriod } from '../utils/period';
import { queryWithSortSchema } from '../utils/validator';

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
        offset: offset || 0,
        limit: limit || 10,
        orderBy: sortBy,
        orderDirection: sortDirection,
        types,
        startDate: newStartDate,
        endDate,
      });
      if (!excludePaging && period !== 'all') {
        const total = await blockService.countGetAll({
          types,
          startDate: newStartDate,
          endDate,
        });
        return res.send({
          data: blocks,
          timestamp: new Date().getTime() / 1000,
          total,
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
 * /v1/blocks/{block_hash}:
 *   get:
 *     summary: Get block detail
 *     tags: [Blocks]
 *     parameters:
 *       - in: path
 *         name: block_hash
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
 *         description: Block hash is required
 *       404:
 *         description: Block not found
 *       500:
 *         description: Internal Error
 */
blockController.get('/:block_hash', async (req, res) => {
  const query: string = req.params.block_hash;
  if (!query) {
    return res.status(400).json({
      message: 'Block hash is required',
    });
  }
  const fetchData = async () => {
    const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
    const block = await blockService.getBlockByIdOrHeight(query);
    if (!block) {
      return res.status(404).json({
        message: 'Block not found',
      });
    }
    const transactions = await transactionService.getAllTransactionByBlockHash(
      block.id,
    );
    const tickets =
      Number(block.height) >= hideToBlock
        ? await ticketService.getTicketsInBlock(block.height)
        : [];
    const senses =
      Number(block.height) >= hideToBlock
        ? await senseRequestsService.getSenseListByBlockHash(block.id)
        : [];
    const addresses = await addressEventsService.getAddressByTxIds(
      transactions.map(t => t.id),
    );
    return res.send({
      data: { ...block, transactions, tickets, senses, addresses },
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
