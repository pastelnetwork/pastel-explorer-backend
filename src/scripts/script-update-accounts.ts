import 'dotenv/config';

import { exit } from 'process';

import { dataSource } from '../datasource';
import addressEventsService from '../services/address-events.service';
import statsService from '../services/stats.service';

async function updateAccounts() {
  const processingTimeStart = Date.now();
  try {
    const stats = await statsService.getDataForUpdateAccount();
    let counter = 1;
    for (const item of stats) {
      console.log(`Processing ${counter}/${stats.length}`);
      const zeroAddressesCount =
        await addressEventsService.findAllZeroAddresses(
          Math.floor((item.blockTime || item.timestamp) / 1000),
        );
      await statsService.updateAddressCount({
        id: item.id,
        zeroAddressesCount: zeroAddressesCount.length,
        addressesCount:
          Number(item.nonZeroAddressesCount) + zeroAddressesCount.length,
      });
      counter += 1;
    }
  } catch (error) {
    console.error(error);
  }
  console.log(
    `Processing update address finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
  exit();
}

const createConnection = async () => {
  await dataSource;
  await updateAccounts();
};

createConnection()
  .then(async () => {
    // noop
  })
  .catch(error => console.log('TypeORM connection error: ', error));
