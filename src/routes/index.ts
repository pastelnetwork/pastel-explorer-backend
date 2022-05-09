import 'dotenv/config';

import express from 'express';

import {
  blockController,
  currentStatsController,
  peerController,
  searchController,
  statsController,
  transactionController,
  walletAddressController,
} from '../controllers';

export default (app: express.Application): void => {
  app.use('/v1/transaction', transactionController);
  app.use('/v1/address', walletAddressController);
  app.use('/v1/block', blockController);
  app.use('/v1/transactions', transactionController);
  app.use('/v1/addresses', walletAddressController);
  app.use('/v1/blocks', blockController);
  app.use('/v1/search', searchController);
  app.use('/v1/network', peerController);
  app.use('/v1/stats', statsController);
  app.use('/v1/current-stats', currentStatsController);
};
