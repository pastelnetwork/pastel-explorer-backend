import 'reflect-metadata';

import cors from 'cors';
import { CronJob } from 'cron';
import express from 'express';
import { readFileSync } from 'fs';
import { createServer } from 'http';
import path from 'path';
import { RedisClient } from 'redis';
import { Server } from 'socket.io';
import { createAdapter } from 'socket.io-redis';
import { ConnectionOptions, createConnection } from 'typeorm';

import useRoutes from './routes';
import { updateChartScreenshots } from './scripts/charts-screenshots';
import { checkAndRestartPM2 } from './scripts/script-restart-app';
import {
  updateAddressEvents,
  updateUnCorrectBlock,
} from './scripts/seed-blockchain-data/update-block-data';
import { updateDatabaseWithBlockchainData } from './scripts/seed-blockchain-data/update-database';
import transactionService from './services/transaction.service';
import { TIME_CHECK_RESET_PM2 } from './utils/constants';

const connectionOptions = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'ormconfig.json')).toString(),
) as ConnectionOptions;

createConnection({
  ...connectionOptions,
  migrations: [],
  entities: [
    process.env.NODE_ENV === 'production'
      ? 'dist/entity/*.js'
      : 'src/entity/*.ts',
  ],
})
  .then(async connection => {
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
        const existAllowedOrigin = allowedOrigins.find(
          a => origin?.indexOf(a) !== -1,
        );
        const existSkippedOrigin = skippedOrigins.find(
          a => currentPathName?.indexOf(a) !== -1,
        );
        if (existAllowedOrigin || existSkippedOrigin) {
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

    const PORT = process.env.PORT || 3000;

    const server = createServer(app);

    const io = new Server(server, {
      cors: {
        ...corsOptions,
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });
    const pubClient = new RedisClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter({ pubClient, subClient }));

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

    if (process.env.chart === 'explorer-chart-worker') {
      const updateScreenshotsJob = new CronJob('0 */30 * * * *', async () => {
        updateChartScreenshots();
      });
      updateScreenshotsJob.start();
    }

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
  })
  .catch(error => console.log('TypeORM connection error: ', error));
