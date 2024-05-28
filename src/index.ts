import 'reflect-metadata';

import { H, Handlers } from '@highlight-run/node';
import { createAdapter } from '@socket.io/redis-adapter';
import cors from 'cors';
import { CronJob } from 'cron';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { createClient } from 'redis';
import { Server } from 'socket.io';

import { dataSource } from './datasource';
import useRoutes from './routes';
import { backupDatabase } from './scripts/backup-database';
import { updateChartScreenshots } from './scripts/charts-screenshots';
import { checkAndRestartPM2 } from './scripts/script-restart-app';
import {
  updateAddressEvents,
  updateUnCorrectBlock,
} from './scripts/seed-blockchain-data/update-block-data';
import { updateDatabaseWithBlockchainData } from './scripts/seed-blockchain-data/update-database';
import { updateHistoricalMarket } from './scripts/seed-blockchain-data/update-historical-market';
import {
  syncRegisteredCascadeFiles,
  syncRegisteredSenseFiles,
  syncSupernodeFeeSchedule,
} from './scripts/seed-blockchain-data/update-registered-file';
import {
  saveCascade,
  saveNft,
  saveSenseRequests,
} from './scripts/seed-blockchain-data/update-sense-cascade-nft';
import { updateCoinSupply } from './scripts/seed-blockchain-data/update-stats';
import { updateTotalBurnedFile } from './scripts/seed-blockchain-data/update-total-burned-file';
import { reUpdateSenseAndNftData } from './scripts/seed-blockchain-data/updated-ticket';
import transactionService from './services/transaction.service';
import useSwagger from './swagger';
import { TIME_CHECK_RESET_PM2 } from './utils/constants';

H.init({
  projectID: process.env.HIGHLIGHT_PROJECT_ID,
});

const createConnection = async () => {
  const connection = await dataSource;
  const allowedOrigins = (process.env.ALLOWED_ORIGINS as string).split(',');
  const skippedOrigins = (process.env.SKIPPED_ORIGINS as string).split(',');
  const app = express();
  let currentPathName = '';
  app.use(function (req, res, next) {
    currentPathName = req.path;
    next();
  });
  const corsOptions = {
    origin: function (origin, callback) {
      const allowedOrigin = allowedOrigins.find(a => origin?.indexOf(a) !== -1);
      const skippedOrigin = skippedOrigins.find(
        a => currentPathName?.indexOf(a) !== -1,
      );
      if (allowedOrigin || skippedOrigin) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  };
  app.use(cors(corsOptions));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use('/static', express.static(path.join(__dirname, '..', 'public')));
  useRoutes(app);
  useSwagger(app);

  const PORT = process.env.PORT || 3000;

  const server = createServer(app);

  const io = new Server(server, {
    cors: {
      ...corsOptions,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });
  const pubClient = createClient({ url: process.env.REDIS_URL });
  pubClient.on('error', err => console.log('Redis Client Error', err));
  await pubClient.connect();
  const subClient = pubClient.duplicate();
  await subClient.connect();
  io.adapter(createAdapter(pubClient, subClient));

  app.use(
    Handlers.errorHandler({
      projectID: process.env.HIGHLIGHT_PROJECT_ID,
    }),
  );
  server.listen(PORT, async () => {
    console.log(`Express server is running at https://localhost:${PORT}`);
  });

  io.on('connection', socket => {
    console.log(socket.id, ' (websocket ID): connection successful');
  });

  const job = new CronJob(
    '5 * * * * *',
    async () => {
      if (process.env.name === 'explorer-worker') {
        updateDatabaseWithBlockchainData(connection, io);
      }
    },
    null,
    true,
  );
  job.start();

  const updateRegisteredFileJob = new CronJob('10 * * * * *', async () => {
    if (process.env.name === 'explorer-worker') {
      syncSupernodeFeeSchedule(connection);
      syncRegisteredCascadeFiles(connection);
      syncRegisteredSenseFiles(connection);
    }
  });
  updateRegisteredFileJob.start();

  const updateCascadeSenseNftTicketJob = new CronJob(
    '*/10 * * * * *',
    async () => {
      if (process.env.name === 'explorer-worker') {
        saveCascade();
        saveNft();
        saveSenseRequests();
      }
    },
  );
  updateCascadeSenseNftTicketJob.start();

  const updateCoinSupplyJob = new CronJob('*/20 * * * * *', async () => {
    if (process.env.name === 'explorer-worker') {
      updateCoinSupply();
      updateTotalBurnedFile();
    }
  });
  updateCoinSupplyJob.start();

  const updateScreenshotsJob = new CronJob('0 */30 * * * *', async () => {
    if (process.env.chart === 'explorer-chart-worker') {
      updateChartScreenshots();
      reUpdateSenseAndNftData(connection);
    }
  });
  updateScreenshotsJob.start();

  const updateUnCorrectBlockJob = new CronJob('0 0 23 * * *', async () => {
    updateUnCorrectBlock();
  });
  updateUnCorrectBlockJob.start();

  const updateUnTransactionJob = new CronJob('0 0 01 * * *', async () => {
    const date = new Date();
    date.setDate(date.getDate() - 3);
    const time = Math.floor(new Date(date).getTime() / 1000);
    const transactions = await transactionService.getTransactionsByTime(time);
    await updateAddressEvents(connection, transactions);
  });
  updateUnTransactionJob.start();

  const restartPM2Job = new CronJob(
    `*/${TIME_CHECK_RESET_PM2} * * * *`,
    async () => {
      checkAndRestartPM2();
    },
  );
  restartPM2Job.start();

  const backupDataJob = new CronJob('30 23 */3 * *', async () => {
    backupDatabase();
  });
  backupDataJob.start();

  const updateHistoricalMarketJob = new CronJob('*/3 * * * *', async () => {
    if (process.env.name === 'explorer-worker') {
      updateHistoricalMarket();
    }
  });
  updateHistoricalMarketJob.start();
};

createConnection()
  .then(async () => {
    // noop
  })
  .catch(error => console.log('TypeORM connection error: ', error));
