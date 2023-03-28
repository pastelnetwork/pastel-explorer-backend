import express, { Request } from 'express';
import { getConnection } from 'typeorm';

import { TransactionEntity } from '../entity/transaction.entity';
import { updateSenseRequests } from '../scripts/seed-blockchain-data/updated-sense-requests';
import addressEventsService from '../services/address-events.service';
import senseRequestsService from '../services/senserequests.service';
import ticketService from '../services/ticket.service';
import transactionService from '../services/transaction.service';
import { IQueryParameters } from '../types/query-request';
import { sortByTransactionsFields } from '../utils/constants';
import { getStartDateByPeriod, TPeriod } from '../utils/period';
import {
  queryPeriodSchema,
  queryTransactionLatest,
  queryWithSortSchema,
  validateQueryWithGroupData,
} from '../utils/validator';

export const transactionController = express.Router();

/**
 * @swagger
 * /v1/transactions:
 *   get:
 *     summary: Get transactions
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *         required: true
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         required: true
 *       - in: query
 *         name: sortDirection
 *         schema:
 *           type: string
 *         required: false
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         required: false
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Error message
 */
transactionController.get('/', async (req, res) => {
  try {
    const {
      offset,
      limit,
      sortDirection,
      sortBy,
      startDate,
      endDate,
      period,
      excludePaging,
    } = queryWithSortSchema(sortByTransactionsFields).validateSync(req.query);

    let newStartDate: number = startDate || 0;
    if (period) {
      newStartDate = getStartDateByPeriod(period);
    }
    const transactions = await transactionService.findAll({
      limit,
      offset,
      orderBy: sortBy || 'timestamp',
      orderDirection: sortDirection || 'DESC',
      startDate: newStartDate,
      endDate,
    });
    if (!excludePaging) {
      const total = await transactionService.countFindAll(
        newStartDate,
        endDate,
      );
      return res.send({
        data: transactions.map(t => ({
          ...t,
          block: t.block || { confirmations: 0, height: 'N/A' },
        })),
        total: total,
      });
    }
    return res.send({
      data: transactions.map(t => ({
        ...t,
        block: t.block || { confirmations: 0, height: 'N/A' },
      })),
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({ error: error.message || error });
  }
});

// /**
//  * @swagger
//  * /v1/transactions/chart/volume:
//  *   get:
//  *     summary: Get data
//  *     tags: [Transactions]
//  *     parameters:
//  *       - in: query
//  *         name: period
//  *         schema:
//  *           type: string
//  *         required: true
//  *         description: The period
//  *     responses:
//  *       200:
//  *         description: Data
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *       400:
//  *         description: Error message
// */
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

// /**
//  * @swagger
//  * /v1/transactions/chart/latest:
//  *   get:
//  *     summary: Get data
//  *     tags: [Transactions]
//  *     parameters:
//  *       - in: query
//  *         name: period
//  *         schema:
//  *           type: string
//  *         required: true
//  *         description: The period
//  *     responses:
//  *       200:
//  *         description: Data
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *       400:
//  *         description: Error message
// */
transactionController.get('/chart/latest', async (req, res) => {
  try {
    const { period } = queryTransactionLatest.validateSync(req.query);
    const transactions = await transactionService.findFromTimestamp(
      period as TPeriod,
    );

    const dataSeries = transactions.map(t => [
      t.timestamp / 1000,
      t.totalAmount,
    ]);

    return res.send({
      data: dataSeries,
    });
  } catch (error) {
    res.status(400).send({ error: error.message || error });
  }
});

// /**
//  * @swagger
//  * /v1/transactions/blocks-unconfirmed:
//  *   get:
//  *     summary: Get data
//  *     tags: [Transactions]
//  *     responses:
//  *       200:
//  *         description: Data
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
// */
transactionController.get('/blocks-unconfirmed', async (_req, res) => {
  const transactions = await transactionService.getBlocksUnconfirmed();
  res.send({
    data: transactions,
  });
});

// /**
//  * @swagger
//  * /v1/transactions/charts:
//  *   get:
//  *     summary: Get data
//  *     tags: [Transactions]
//  *     parameters:
//  *       - in: query
//  *         name: period
//  *         schema:
//  *           type: string
//  *         required: true
//  *         description: The period
//  *       - in: query
//  *         name: func
//  *         schema:
//  *           type: string
//  *         required: true
//  *         description: The func
//  *       - in: query
//  *         name: col
//  *         schema:
//  *           type: string
//  *         required: true
//  *         description: The col
//  *       - in: query
//  *         name: timestamp
//  *         schema:
//  *           type: number
//  *         required: false
//  *         description: The timestamp
//  *       - in: query
//  *         name: groupBy
//  *         schema:
//  *           type: string
//  *         required: false
//  *         description: The groupBy
//  *       - in: query
//  *         name: startValue
//  *         schema:
//  *           type: string
//  *         required: false
//  *         description: The startValue
//  *     responses:
//  *       200:
//  *         description: Data
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *       400:
//  *         description: Error message
// */
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
      const { period, func, col } = validateQueryWithGroupData.validateSync(
        req.query,
      );
      const sqlQuery = `${func}(${col})`;
      const startTime = Number(req.query?.timestamp?.toString() || '');
      const data = await transactionService.getTransactionsInfo(
        sqlQuery,
        period,
        'ASC',
        startTime,
        req.query.groupBy,
        req.query.startValue,
      );
      return res.send({
        data: data.items,
        startValue: data.startValue,
        endValue: data.endValue,
      });
    } catch (e) {
      return res.status(400).send({ error: e.message });
    }
  },
);

// /**
//  * @swagger
//  * /v1/transactions/sense:
//  *   get:
//  *     summary: Get data
//  *     tags: [Transactions]
//  *     parameters:
//  *       - in: query
//  *         name: hash
//  *         schema:
//  *           type: string
//  *         required: false
//  *         description: The hash
//  *       - in: query
//  *         name: txid
//  *         schema:
//  *           type: string
//  *         required: false
//  *         description: The txid
//  *     responses:
//  *       200:
//  *         description: Data
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *       400:
//  *         description: Image hash or txid is required
//  *       500:
//  *         description: Internal Error.
// */
transactionController.get('/sense', async (req, res) => {
  const id: string = req.query.hash as string;
  const txid: string = req.query.txid as string;
  if (!id && !txid) {
    return res.status(400).json({
      message: 'Image hash or txid is required',
    });
  }

  try {
    let data = await senseRequestsService.getSenseRequestByImageHash(id, txid);
    if (!data && txid) {
      const transaction = await transactionService.findOneById(txid);
      const imageHash = await updateSenseRequests(
        getConnection(),
        txid,
        {
          imageTitle: '',
          imageDescription: '',
          isPublic: true,
          ipfsLink: '',
          sha256HashOfSenseResults: '',
        },
        Number(transaction.block.height),
        transaction.timestamp * 1000,
      );

      data = await senseRequestsService.getSenseRequestByImageHash(
        imageHash,
        txid,
      );
    }

    return res.send({
      data: data
        ? {
            imageFileHash: data.imageFileHash,
            rawData: data.rawData,
            transactionHash: data.transactionHash,
            rarenessScoresTable: data.rarenessScoresTable,
            pastelIdOfSubmitter: data.pastelIdOfSubmitter,
            blockHash: data.blockHash,
            blockHeight: data.blockHeight,
            utcTimestampWhenRequestSubmitted:
              data.utcTimestampWhenRequestSubmitted,
            pastelIdOfRegisteringSupernode1:
              data.pastelIdOfRegisteringSupernode1,
            pastelIdOfRegisteringSupernode2:
              data.pastelIdOfRegisteringSupernode2,
            pastelIdOfRegisteringSupernode3:
              data.pastelIdOfRegisteringSupernode3,
            isPastelOpenapiRequest: data.isPastelOpenapiRequest,
            openApiSubsetIdString: data.openApiSubsetIdString,
            isLikelyDupe: data.isLikelyDupe,
            dupeDetectionSystemVersion: data.dupeDetectionSystemVersion,
            openNsfwScore: data.openNsfwScore,
            rarenessScore: data.rarenessScore,
            alternativeNsfwScores: data.alternativeNsfwScores,
            internetRareness: data.internetRareness,
            imageFingerprintOfCandidateImageFile:
              data.imageFingerprintOfCandidateImageFile,
            prevalenceOfSimilarImagesData: {
              '25%': data?.pctOfTop10MostSimilarWithDupeProbAbove25pct || 0,
              '33%': data?.pctOfTop10MostSimilarWithDupeProbAbove33pct || 0,
              '50%': data?.pctOfTop10MostSimilarWithDupeProbAbove50pct || 0,
            },
          }
        : null,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Error.');
  }
});

/**
 * @swagger
 * /v1/transaction/{id}:
 *   get:
 *     summary: Get transaction by txid (transaction hash)
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: id is required
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Internal Error.
 */
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

    const tickets = await ticketService.getTicketsByTxId(id);
    const senseData =
      await senseRequestsService.getSenseListForTransactionDetails(id);

    return res.send({
      data: {
        ...transaction,
        transactionEvents,
        block: transaction.block || { confirmations: 0, height: 'N/A' },
        blockHash: transaction.blockHash || 'N/A',
        ticketsList: tickets,
        senseData,
      },
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

// /**
//  * @swagger
//  * /v1/transactions/pastelid/{id}:
//  *   get:
//  *     summary: Get data
//  *     tags: [Transactions]
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         schema:
//  *           type: string
//  *         required: true
//  *         description: The id
//  *       - in: query
//  *         name: offset
//  *         schema:
//  *           type: number
//  *         required: true
//  *         description: The offset
//  *       - in: query
//  *         name: limit
//  *         schema:
//  *           type: number
//  *         required: true
//  *         description: The limit
//  *       - in: query
//  *         name: type
//  *         schema:
//  *           type: string
//  *         required: true
//  *         description: The type
//  *       - in: query
//  *         name: username
//  *         schema:
//  *           type: string
//  *         required: false
//  *         description: The username
//  *     responses:
//  *       200:
//  *         description: Data
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *       400:
//  *         description: id is required
//  *       500:
//  *         description: Internal Error.
// */
transactionController.get('/pastelid/:id', async (req, res) => {
  const id: string = req.params.id;
  if (!id) {
    return res.status(400).json({
      message: 'id is required',
    });
  }
  const { offset, limit, type, username } = req.query;

  try {
    const data = await ticketService.getTicketsByPastelId(
      id,
      type?.toString(),
      Number(offset),
      Number(limit),
    );
    const total = await ticketService.countTotalTicketByPastelId(
      id,
      type?.toString(),
    );
    const totalAllTickets = await ticketService.countTotalTicketByPastelId(
      id,
      'all',
    );
    let position = 0;
    if (username && type === 'username-change') {
      const ticket = await ticketService.getPositionUsernameInDbByPastelId(
        id,
        username.toString(),
      );
      position = ticket.position;
    }
    const ticketsType = await ticketService.getTotalTypeByPastelId(id);
    const senses = await senseRequestsService.getAllByPastelId(id);
    const latestUsername = await ticketService.getLatestUsernameForPastelId(id);
    const registeredPastelId = await ticketService.getRegisteredPastelId(id);
    return res.send({
      data,
      total,
      ticketsType,
      totalAllTickets,
      senses,
      username: latestUsername?.rawData
        ? JSON.parse(latestUsername?.rawData)?.ticket?.username
        : undefined,
      position: username && type === 'username-change' ? position : undefined,
      blockHeight: registeredPastelId.height,
      registeredDate: registeredPastelId?.rawData
        ? JSON.parse(registeredPastelId?.rawData).ticket.timestamp
        : 0,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Error.');
  }
});

// /**
//  * @swagger
//  * /v1/transaction/tickets/{type}:
//  *   get:
//  *     summary: Get data
//  *     tags: [Transactions]
//  *     parameters:
//  *       - in: path
//  *         name: type
//  *         schema:
//  *           type: string
//  *         required: true
//  *         description: The type
//  *       - in: query
//  *         name: limit
//  *         schema:
//  *           type: number
//  *         required: true
//  *         description: The limit
//  *       - in: query
//  *         name: offset
//  *         schema:
//  *           type: number
//  *         required: true
//  *         description: The offset
//  *       - in: query
//  *         name: include
//  *         schema:
//  *           type: string
//  *         required: false
//  *         description: The include
//  *       - in: query
//  *         name: period
//  *         schema:
//  *           type: string
//  *         required: false
//  *         description: The period
//  *       - in: query
//  *         name: status
//  *         schema:
//  *           type: string
//  *         required: false
//  *         description: The status
//  *       - in: query
//  *         name: startDate
//  *         schema:
//  *           type: number
//  *         required: false
//  *         description: The startDate
//  *       - in: query
//  *         name: endDate
//  *         schema:
//  *           type: number
//  *         required: false
//  *         description: The endDate
//  *     responses:
//  *       200:
//  *         description: Data
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *       400:
//  *         description: type is required
//  *       500:
//  *         description: Internal Error.
// */
transactionController.get('/tickets/:type', async (req, res) => {
  const type: string = req.params.type;
  if (!type) {
    return res.status(400).json({
      message: 'type is required',
    });
  }
  try {
    const { offset, limit, include, period, status, startDate, endDate } =
      req.query;

    let newStartDate: number = Number(startDate) || 0;
    if (period) {
      newStartDate = getStartDateByPeriod(period as TPeriod);
    }
    const newEndDate = Number(endDate) || null;
    let total = await ticketService.countTotalTicketsByType(
      type,
      newStartDate,
      newEndDate,
    );
    if (include === 'all') {
      const tickets = await ticketService.getTicketsType(
        type,
        Number(offset),
        Number(limit),
        status as string,
        newStartDate,
        newEndDate,
      );
      let txIds = tickets?.map(ticket => ticket.transactionHash);
      let newTickets = tickets || [];
      if (['sense', 'cascade'].includes(type)) {
        if (status) {
          switch (status as string) {
            case 'activated':
              newTickets = tickets.filter(
                ticket => ticket.data.ticket?.activation_ticket,
              );
              txIds = newTickets?.map(ticket => ticket.transactionHash) || [];
              break;
            case 'inactivated':
              newTickets = tickets.filter(
                ticket => !ticket.data?.ticket?.activation_ticket,
              );
              txIds = newTickets?.map(ticket => ticket.transactionHash) || [];
              break;
            default:
              break;
          }
          total = await ticketService.countTotalTicketsByStatus(
            type,
            status as string,
            newStartDate,
            newEndDate,
          );
        }
      }
      let senses = [];
      if (txIds?.length) {
        senses = await senseRequestsService.getImageHashByTxIds(txIds);
      }
      return res.send({
        data: newTickets,
        total,
        senses,
      });
    }

    let tickets = await ticketService.getTicketsByType(
      type,
      Number(offset),
      Number(limit),
    );
    const txIds = tickets?.map(ticket => ticket.transactionHash);
    let senses = [];
    if (txIds?.length) {
      senses = await senseRequestsService.getImageHashByTxIds(txIds);
    }
    tickets = tickets.map(ticket => {
      const sense = senses.find(
        s => s.transactionHash === ticket.transactionHash,
      );
      return {
        ...ticket,
        imageHash: sense?.imageFileHash || '',
        dupeDetectionSystemVersion: sense?.dupeDetectionSystemVersion || '',
      };
    });
    return res.send({ tickets, total });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Error.');
  }
});
