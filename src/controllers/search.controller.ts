import express from 'express';

import addressEventsService from '../services/address-events.service';
import blockService from '../services/block.service';
import senseService from '../services/senserequests.service';
import ticketService from '../services/ticket.service';
import transactionService from '../services/transaction.service';
import { searchQuerySchema } from '../utils/validator';

export const searchController = express.Router();

/**
 * @swagger
 * /v1/search:
 *   get:
 *     summary: Search by Block Height, Block Hash, TxID, Address, PastelID, Username, or Image File Hash
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Successful Response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Results'
 *       400:
 *         description: Error message.
 */
searchController.get('/', async (req, res) => {
  try {
    const { keyword: searchParam } = searchQuerySchema.validateSync(req.query);
    const blocksIdsPromise = blockService.searchByBlockHash(searchParam);
    const blocksHeightsPromise = blockService.searchByBlockHeight(searchParam);
    const transactionsPromise =
      transactionService.searchByTransactionHash(searchParam);
    const addressListPromise =
      addressEventsService.searchByWalletAddress(searchParam);
    const senseListPromise = senseService.searchByImageHash(searchParam);
    const pastelIdListPromise = ticketService.searchPastelId(searchParam);
    const usernameListPromise = ticketService.searchByUsername(searchParam);

    const [
      blocksIds,
      blocksHeights,
      transactions,
      addressList,
      senseList,
      pastelIdList,
      usernameList,
    ] = await Promise.all([
      blocksIdsPromise,
      blocksHeightsPromise,
      transactionsPromise,
      addressListPromise,
      senseListPromise,
      pastelIdListPromise,
      usernameListPromise,
    ]);

    return res.send({
      data: {
        address: addressList.map(v => v.address),
        transactions: transactions.map(v => v.id),
        blocksIds: blocksIds.map(v => v.id),
        blocksHeights: blocksHeights.map(v => v.height),
        senses: senseList.map(v => v.imageFileHash),
        pastelIds: pastelIdList.map(v => v.pastelID),
        usernameList,
      },
    });
  } catch (error) {
    return res.status(400).send({ error: error.message || error });
  }
});
