import 'dotenv/config';

import { exit } from 'process';
import prompt from 'prompt';
import { Connection, createConnection } from 'typeorm';

import { TicketEntity } from '../entity/ticket.entity';
import senseRequestsService from '../services/senserequests.service';
import {
  isNumber,
  readLastBlockHeightFile,
  writeLastBlockHeightFile,
} from '../utils/helpers';
import {
  updateSenseRequestByBlockHeight,
  updateSenseRequestsByTxId,
} from './seed-blockchain-data/updated-sense-requests';

const fileName = 'lastUpdateSenseByBlockHeight.txt';

async function updateSenses(connection: Connection) {
  let lastBlockHeight = 0;
  if (!process.argv[2]) {
    lastBlockHeight = await readLastBlockHeightFile(fileName);
  }
  const updateSensesData = async (sqlWhere = 'height > 0') => {
    const processingTimeStart = Date.now();
    const ticketRepo = connection.getRepository(TicketEntity);
    const blocksList = await ticketRepo
      .createQueryBuilder()
      .select('height')
      .where(sqlWhere)
      .andWhere("type = 'action-reg'")
      .andWhere('rawData LIKE \'%"action_type":"sense"%\'')
      .orderBy('CAST(height AS INT)')
      .groupBy('height')
      .getRawMany();

    for (let j = 0; j < blocksList.length; j += 1) {
      const blockHeight = Number(blocksList[j].height);
      if (!process.argv[2]) {
        await writeLastBlockHeightFile(blockHeight.toString(), fileName);
      }
      console.log(`Processing block ${blockHeight}`);
      await senseRequestsService.deleteTicketByBlockHeight(blockHeight);
      await updateSenseRequestByBlockHeight(connection, blockHeight);
    }
    console.log(
      `Processing update senses finished in ${
        Date.now() - processingTimeStart
      }ms`,
    );
    await writeLastBlockHeightFile('0', fileName);
    exit();
  };
  const updateSenseByTxID = async (txId: string) => {
    const processingTimeStart = Date.now();
    console.log(`Processing txID ${txId}`);
    await updateSenseRequestsByTxId(connection, process.argv[2]);
    console.log(
      `Processing update senses finished in ${
        Date.now() - processingTimeStart
      }ms`,
    );
    exit();
  };
  const promptConfirmMessages = () => {
    prompt.start();

    prompt.message = '';
    prompt.delimiter = '';
    prompt.colors = false;

    prompt.get(
      {
        properties: {
          confirm: {
            pattern: /^(yes|no|y|n)$/gi,
            description: `The update-senses have been stopped at block ${lastBlockHeight} in the last update. Do you want to restart the update-senses from block ${lastBlockHeight} (y/n)?`,
            message: 'Type y/n',
            required: true,
          },
        },
      },
      async (err, result) => {
        const c = (result.confirm as string).toLowerCase();
        if (c != 'y' && c != 'yes') {
          await updateSensesData();
          return;
        }
        const sqlWhere = `CAST(height AS INT) >= ${lastBlockHeight}`;
        await updateSensesData(sqlWhere);
      },
    );
  };
  if (!process.argv[2]) {
    if (lastBlockHeight > 0) {
      promptConfirmMessages();
    } else {
      await updateSensesData();
    }
  } else {
    if (
      isNumber(process.argv[2]) ||
      process.argv[2]?.toLowerCase() === 'startat'
    ) {
      let sqlWhere = `CAST(height AS INT) = ${Number(process.argv[2])}`;
      if (process.argv[2]?.toLowerCase() === 'startat' && process.argv[3]) {
        sqlWhere = `CAST(height AS INT) >= ${Number(process.argv[3])}`;
      }
      await updateSensesData(sqlWhere);
    } else {
      await updateSenseByTxID(process.argv[2]);
    }
  }
}

createConnection().then(updateSenses);
