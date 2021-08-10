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

    const frontendUrl =
      process.env.FRONTEND_URL || 'https://explorer.pastel.network';

    const server = createServer(app);

    const io = new Server(server, {
      cors: {
        origin: frontendUrl,
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });
    const pubClient = new RedisClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    io.adapter(createAdapter({ pubClient, subClient }));
    io.adapter();
    server.listen(PORT, async () => {
      console.log(`Express server is running at https://localhost:${PORT}`);
    });

    io.on('connection', socket => {
      console.log(socket.id, ' (websocket ID): connection successful');
    });

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
