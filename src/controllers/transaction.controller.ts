import axios from 'axios';
import express, { Request } from 'express';

import { TransactionEntity } from '../entity/transaction.entity';
import addressEventsService from '../services/address-events.service';
import ticketService from '../services/ticket.service';
import transactionService from '../services/transaction.service';
import { IQueryParameters } from '../types/query-request';
import { sortByTransactionsFields } from '../utils/constants';
import {
  queryPeriodSchema,
  queryTransactionLatest,
  queryWithSortSchema,
  validateQueryWithGroupData,
} from '../utils/validator';

export const transactionController = express.Router();

transactionController.get('/', async (req, res) => {
  try {
    const { offset, limit, sortDirection, sortBy, period } =
      queryWithSortSchema(sortByTransactionsFields).validateSync(req.query);
    const transactions = await transactionService.findAll(
      limit,
      offset,
      sortBy || 'timestamp',
      sortDirection || 'DESC',
      period,
    );
    const total = await transactionService.countFindAll(period);
    return res.send({
      data: transactions.map(t => ({
        ...t,
        block: t.block || { confirmations: 0, height: 'N/A' },
      })),
      total: total,
    });
  } catch (error) {
    res.status(400).send({ error: error.message || error });
  }
});

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

transactionController.get('/chart/latest', async (req, res) => {
  try {
    const { limit } = queryTransactionLatest.validateSync(req.query);
    const from = new Date(
      new Date().setDate(new Date().getDate() - parseInt(limit.toString(), 10)),
    );
    const transactions = await transactionService.findFromTimestamp(
      from.valueOf() / 1000,
    );

    const dataSeries = transactions.map(t => [t.timestamp, t.totalAmount]);

    return res.send({
      data: dataSeries,
    });
  } catch (error) {
    res.status(400).send({ error: error.message || error });
  }
});

transactionController.get('/blocks-unconfirmed', async (_req, res) => {
  const transactions = await transactionService.getBlocksUnconfirmed();
  res.send({
    data: transactions,
  });
});

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

    return res.send({
      data: {
        ...transaction,
        transactionEvents,
        block: transaction.block || { confirmations: 0, height: 'N/A' },
        blockHash: transaction.blockHash || 'N/A',
        tickets,
      },
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});

transactionController.get('/sense/:id', async (req, res) => {
  const id: string = req.params.id;
  if (!id) {
    return res.status(400).json({
      message: 'id is required',
    });
  }
  try {
    return res.send({
      data: {
        isLikelyDupe: true,
        senseVersion: 2.3,
        openNSFWScore: 0.000008896661,
        rarenessScore: 0.018954802,
        image: {
          url: 'http://res.cloudinary.com/pastelnetwork/image/upload/v1/sense_demo/a2fd790f260c737815c0fac9272bfc28653a15c49439173fef2398df154e42ab.jpg',
          hash: 'a2fd790f260c737815c0fac9272bfc28653a15c49439173fef2398df154e42ab',
          title: 'Dupe_01 of cc87026771',
          description: 'Generated Near Dupes',
          isPublic: true,
        },
        ipfs: {
          link: 'https://ipfs.io/ipfs/QmWXjsEsHEumsynvnShTbv1ohbbjy2rs3LJ5bL6HannfiG',
          hash: '862a3a158317a775d0ff5f05414e0ac582a24a24a325a83c681271a86876b262',
        },
        pastelData: {
          pastelBlockHashWhenRequestSubmitted:
            '00000000819d1ddc92d6a2f78d59c2554c3d47f4ec443c286fde29f84523a607',
          pastelBlockHeightWhenRequestSubmitted: 240669,
          utcTimestampWhenRequestSubmitted: '2022-05-13 20:27:09',
          pastelIdOfSubmitter:
            'jXIGc0SbVWHFRKemuDSpkTIrCybP3tFbT2c5LOZZuKgBZf95eFZ62QkBP4mmFoZrQkVB0bmn70Oran3vg5fW1X',
          pastelIdOfRegisteringSupernode1:
            'jXYiHNqO9B7psxFQZb1thEgDNykZjL8GkHMZNPZx3iCYre1j3g0zHynlTQ9TdvY6dcRlYIsNfwIQ6nVXBSVJis',
          pastelIdOfRegisteringSupernode2:
            'jXpDb5K6S81ghCusMOXLP6k0RvqgFhkBJSFf6OhjEmpvCWGZiptRyRgfQ9cTD709sA58m5czpipFnvpoHuPX0F',
          pastelIdOfRegisteringSupernode3:
            'jXS9NIXHj8pd9mLNsP2uKgIh1b3EH2aq5dwupUF7hoaltTE8Zlf6R7Pke0cGr071kxYxqXHQmfVO5dA4jH0ejQ',
          isPastelOpenApiRequest: false,
          openApiSubsetIdString: 'NA',
        },
        prevalenceOfSimilarImagesData: {
          dupeProbAbove25pct: 0.2,
          dupeProbAbove33pct: 0.2,
          dupeProbAbove50pct: 0.2,
        },
        alternativeNsfwScores: [
          {
            labels: 'drawings',
            value: 0.65317976,
          },
          {
            labels: 'hentai',
            value: 0.1246991,
          },
          {
            labels: 'neutral',
            value: 0.1796883,
          },
          {
            labels: 'porn',
            value: 0.026139315,
          },
          {
            labels: 'sexy',
            value: 0.016293528,
          },
        ],
        subgraph: {
          nodes: [
            {
              fileHash: '1',
              imgLink:
                'https://res.cloudinary.com/pastelnetwork/image/upload/w_900/f_auto/q_auto/v1649393594/sense_demo/b6556c14f00ddc8e8687f84ad8b24782ef9aa827e2bd327272a24950632cf057',
              rarenessScore: 0.70867926,
              openNsfwScore: 0.0018216148,
              isLikelyDupe: false,
              x: 134.2215,
              y: 862.7517,
              label:
                'b5b9d989dc47c7b7fa892e9a43952b13a16f86c778d573b37a4876d94b84d587',
              id: 'img1',
            },
            {
              fileHash: '2',
              imgLink:
                'https://res.cloudinary.com/pastelnetwork/image/upload/w_900/f_auto/q_auto/v1649393594/sense_demo/cca5fc7bc62491b55a27191c3f53f625d93f33b62d05c1dd2e85750b13fd2e10',
              rarenessScore: 0.50867926,
              openNsfwScore: 0.0028216148,
              isLikelyDupe: true,
              x: 184.2215,
              y: 802.7517,
              label:
                '680e5f70c374c6bdb35426a012eaaf3fdfb049e7e177bdf6fdeb05b0fdf86e06',
              id: 'img2',
            },
            {
              fileHash: '3',
              imgLink:
                'https://res.cloudinary.com/pastelnetwork/image/upload/w_900/f_auto/q_auto/v1649393594/sense_demo/84a0322f4f0b0bc641810f429dad26d8923ff5d9a1f63d18ce908f08fa233e10',
              rarenessScore: 0.50867926,
              openNsfwScore: 0.0028216148,
              isLikelyDupe: true,
              x: 90.2215,
              y: 852.7517,
              label:
                '84a0322f4f0b0bc641810f429dad26d8923ff5d9a1f63d18ce908f08fa233e10',
              id: 'img3',
            },
          ],
          edges: [
            {
              sourceID: 'img1',
              targetID: 'img2',
            },
            {
              sourceID: 'img1',
              targetID: 'img3',
            },
          ],
        },
      },
    });
  } catch (error) {
    res.status(500).send('Internal Error.');
  }
});
