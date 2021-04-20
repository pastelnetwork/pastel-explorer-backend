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
// create connection with database
// note that it's not active database connection
// TypeORM creates connection pools and uses them for your requests
createConnection({
  ...connectionOptions,
  entities: [
    process.env.NODE_ENV === 'production'
      ? 'dist/entity/*.js'
      : 'src/entity/*.ts',
  ],
})
  .then(async connection => {
    // create express app
    const app = express();
    app.use(cors());
    app.use(express.urlencoded());
    app.use(express.json());

    useRoutes(app);

    const PORT = process.env.PORT || 3000;
    setTimeout(() => updateDatabaseWithBlockchainData(connection), 0);
    setInterval(() => updateDatabaseWithBlockchainData(connection), 60 * 1000);
    app.listen(PORT, async () => {
      console.log(
        `⚡️[server]: Server is running at https://localhost:${PORT}`,
      );
    });
  })
  .catch(error => console.log('TypeORM connection error: ', error));
