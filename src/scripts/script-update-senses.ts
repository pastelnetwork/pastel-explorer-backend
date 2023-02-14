import 'dotenv/config';

import { exit } from 'process';
import { Connection, createConnection } from 'typeorm';

import { SenseRequestsEntity } from '../entity/senserequests.entity';
import { updateSenseRequests } from './seed-blockchain-data/updated-sense-requests';

async function updateSenses(connection: Connection) {
  const processingTimeStart = Date.now();
  const senseRepo = connection.getRepository(SenseRequestsEntity);
  let sqlWhere = 'transactionHash IS NOT NULL';
  if (process.argv[2]) {
    sqlWhere = `transactionHash = '${process.argv[2]}'`;
  }
  const sensesList = await senseRepo
    .createQueryBuilder()
    .select('transactionHash, currentBlockHeight')
    .where(sqlWhere)
    .orderBy('currentBlockHeight')
    .getRawMany();
  for (let i = 0; i < sensesList.length; i += 1) {
    if (sensesList[i].transactionHash) {
      console.log(`Processing TXID ${sensesList[i].transactionHash}`);
      await updateSenseRequests(
        connection,
        sensesList[i].transactionHash,
        {
          imageTitle: '',
          imageDescription: '',
          isPublic: true,
          ipfsLink: '',
          sha256HashOfSenseResults: '',
        },
        sensesList[i].currentBlockHeight,
      );
    }
  }
  console.log(
    `Processing update senses finished in ${
      Date.now() - processingTimeStart
    }ms`,
  );
  exit();
}

createConnection().then(updateSenses);
