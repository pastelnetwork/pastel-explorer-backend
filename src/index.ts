import 'dotenv/config';
import 'reflect-metadata';

import cors from 'cors';
import { CronJob } from 'cron';
import express from 'express';
import { readFileSync } from 'fs';
import { createServer } from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { ConnectionOptions, createConnection } from 'typeorm';

import useRoutes from './routes';
import { updateDatabaseWithBlockchainData } from './scripts/seed-blockchain-data/update-database';

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
    const app = express();
    app.use(cors());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    useRoutes(app);

    const PORT = process.env.PORT || 3000;

    const server = createServer(app);

    const io = new Server(server, {
      cors: {
        origin:
          process.env.SITE_URL || 'https://explorer-staging.pastel.network',
        methods: ['GET', 'POST'],
      },
    });

    server.listen(PORT, async () => {
      console.log(
        `⚡️[server]: Server is running at https://localhost:${PORT}`,
      );
    });
    io.on('connection', socket => {
      console.log(socket.id, ': successed');
    });
    // server.listen('3005');
    const job = new CronJob(
      '*/30 * * * * *',
      async () => {
        if (process.env.name === 'worker') {
          updateDatabaseWithBlockchainData(connection, io);
        }
      },
      null,
      true,
    );

    job.start();
  })
  .catch(error => console.log('TypeORM connection error: ', error));
