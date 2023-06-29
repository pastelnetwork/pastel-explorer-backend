import 'dotenv/config';

import { exit } from 'process';
import { Connection, createConnection } from 'typeorm';

import addressEventsService from '../services/address-events.service';
import { updateAddress } from './seed-blockchain-data/update-address';

async function updateAddresses(connection: Connection) {
  const processingTimeStart = Date.now();
  console.log('Starting...');
  const addressList = await addressEventsService.getAllAddress();
  for (let i = 0; i < addressList.length; i++) {
    console.log(`Processing address ${addressList[i].address}`);
    await updateAddress(connection, addressList[i].address);
  }
  console.log(
    `Processing update address finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
  exit();
}

createConnection().then(updateAddresses);
