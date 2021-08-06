import express from 'express';

import addressEventsService from '../services/address-events.service';
import blockService from '../services/block.service';
import transactionService from '../services/transaction.service';
import { searchQuerySchema } from '../utils/validator';

export const searchController = express.Router();

searchController.get('/', async (req, res) => {
  try {
    const { query: searchParam } = searchQuerySchema.validateSync(req.query);
    const blocksIdsPromise = blockService.searchByBlockHash(searchParam);
    const blocksHeightsPromise = blockService.searchByBlockHeight(searchParam);
    const transactionsPromise =
      transactionService.searchByTransactionHash(searchParam);
    const addressListPromise =
      addressEventsService.searchByWalletAddress(searchParam);

    const [blocksIds, blocksHeights, transactions, addressList] =
      await Promise.all([
        blocksIdsPromise,
        blocksHeightsPromise,
        transactionsPromise,
        addressListPromise,
      ]);

    return res.send({
      data: {
        address: addressList.map(v => v.address),
        transactions: transactions.map(v => v.id),
        blocksIds: blocksIds.map(v => v.id),
        blocksHeights: blocksHeights.map(v => v.height),
      },
    });
  } catch (error) {
    return res.status(400).send({ error: error.message || error });
  }
});
