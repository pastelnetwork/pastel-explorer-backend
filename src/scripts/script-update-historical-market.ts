import 'dotenv/config';

import { exit } from 'process';
import { createConnection } from 'typeorm';

import { updateHistoricalMarket } from './seed-blockchain-data/update-historical-market';

async function updatedHistoricalMarket() {
  const processingTimeStart = Date.now();
  await updateHistoricalMarket();
  console.log(
    `Processing update historical market finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
  exit();
}

createConnection().then(updatedHistoricalMarket);
