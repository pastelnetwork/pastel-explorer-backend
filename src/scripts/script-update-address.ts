import 'dotenv/config';

import { exit } from 'process';
import { Connection } from 'typeorm';

import { dataSource } from '../datasource';
import addressService from '../services/address.service';
import addressEventsService from '../services/address-events.service';
import { updateAddress } from './seed-blockchain-data/update-address';

async function updateAddresses(connection: Connection) {
  const processingTimeStart = Date.now();

  if (process.argv[2]) {
    await updateAddress(connection, process.argv[2]);
  } else {
    await addressService.deleteAll();
    const addressList = await addressEventsService.getAllAddress();
    for (let i = 0; i < addressList.length; i++) {
      console.log(`Processing address ${addressList[i].address}`);
      await updateAddress(connection, addressList[i].address);
    }
  }
  console.log(
    `Processing update address finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
  exit();
}

const createConnection = async () => {
  const connection = await dataSource;
  await updateAddresses(connection);
};

createConnection()
  .then(async () => {
    // noop
  })
  .catch(error => console.log('TypeORM connection error: ', error));
