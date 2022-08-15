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
import {
  updateAddressEvents,
  updateUnCorrectBlock,
} from './scripts/seed-blockchain-data/update-block-data';
import { updateDatabaseWithBlockchainData } from './scripts/seed-blockchain-data/update-database';
import transactionService from './services/transaction.service';

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
    const app = express();
    app.use(function (req, res, next) {
      req.headers.origin =
        req.headers.origin || req.headers.host || req.headers.referer;
      if (
        !req.headers.origin ||
        req.headers.origin.indexOf('172.31.29.54') !== -1
      ) {
        req.headers.origin = process.env.DEFAULT_ALLOWED_ORIGINS;
      }
      next();
    });
    const corsOptions = {
      origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
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
    if (process.env.chart === 'explorer-chart-worker') {
      const updateScreenshotsJob = new CronJob('0 */30 * * * *', async () => {
        updateChartScreenshots();
      });
      updateScreenshotsJob.start();
    }
    job.start();

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
  })
  .catch(error => console.log('TypeORM connection error: ', error));
