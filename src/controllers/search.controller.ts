import express from 'express';

import addressEventsService from '../services/address-events.service';
import blockService from '../services/block.service';
import transactionService from '../services/transaction.service';

export const searchController = express.Router();

searchController.get('/', async (req, res) => {
  const searchParam: string = Array.isArray(req.query.query)
    ? (req.query.query[0] as string)
    : (req.query.query as string);
  if (!searchParam) {
    return res.status(400).json({
      message: 'search query param is required',
    });
  }
  try {
    const blocksIdsPromise = blockService.searchByBlockHash(searchParam);
    const blocksHeightsPromise = blockService.searchByBlockHeight(searchParam);
    const transactionsPromise = transactionService.searchByTransactionHash(
      searchParam,
    );
    const addressListPromise = addressEventsService.searchByWalletAddress(
      searchParam,
    );

    const [
      blocksIds,
      blocksHeights,
      transactions,
      addressList,
    ] = await Promise.all([
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
    res.status(500).send('Internal Error.');
  }
});
