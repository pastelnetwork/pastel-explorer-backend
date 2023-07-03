import 'dotenv/config';

import { exit } from 'process';
import { Connection, createConnection } from 'typeorm';

import {
  updateAddress,
  updateAllAddress,
} from './seed-blockchain-data/update-address';

async function updateAddresses(connection: Connection) {
  const processingTimeStart = Date.now();
  if (!process.argv[2]) {
    await updateAllAddress(connection);
  } else {
    await updateAddress(connection, process.argv[2]);
  }
  console.log(
    `Processing update address finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
  exit();
}

createConnection().then(updateAddresses);
