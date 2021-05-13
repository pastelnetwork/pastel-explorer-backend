import 'dotenv/config';
import 'reflect-metadata';

import cors from 'cors';
import express from 'express';
import { readFileSync } from 'fs';
import path from 'path';
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
    app.use(express.urlencoded());
    app.use(express.json());
    useRoutes(app);

    // It's to avoid concurrent executions for pm2 development time
    if (!process.env.DISABLE_WORKER_INTERVAL) {
      setTimeout(() => updateDatabaseWithBlockchainData(connection), 0);
      setInterval(() => updateDatabaseWithBlockchainData(connection), 60 * 1000);
    }
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, async () => {
      console.log(
        `⚡️[server]: Server is running at https://localhost:${PORT}`,
      );
    });
  })
  .catch(error => console.log('TypeORM connection error: ', error));
