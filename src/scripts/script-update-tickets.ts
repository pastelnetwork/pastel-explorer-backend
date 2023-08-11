import 'dotenv/config';

import { exit } from 'process';
import prompt from 'prompt';
import { Connection, createConnection } from 'typeorm';

import { BlockEntity } from '../entity/block.entity';
import ticketService from '../services/ticket.service';
import {
  readLastBlockHeightFile,
  writeLastBlockHeightFile,
} from '../utils/helpers';
import { updateTicketsByBlockHeight } from './seed-blockchain-data/updated-ticket';

const fileName = 'lastUpdateTicketsByBlockHeight.txt';

async function updateTickets(connection: Connection) {
  let lastBlockHeight = 0;
  if (!process.argv[2]) {
    lastBlockHeight = await readLastBlockHeightFile(fileName);
  }
  const updateTicketsData = async (sqlWhere = 'height > 0') => {
    const processingTimeStart = Date.now();
    const blockRepo = connection.getRepository(BlockEntity);
    const blocksList = await blockRepo
      .createQueryBuilder()
      .select(['id', 'height'])
      .where(sqlWhere)
      .orderBy('CAST(height AS INT)')
      .getRawMany();
    for (let j = 0; j < blocksList.length; j += 1) {
      const blockHeight = Number(blocksList[j].height);
      if (!process.argv[2]) {
        await writeLastBlockHeightFile(blocksList[j].height, fileName);
      }
      console.log(`Processing block ${blockHeight}`);
      await ticketService.deleteTicketByBlockHeight(blockHeight);
      await updateTicketsByBlockHeight(connection, blockHeight);
    }
    console.log(
      `Processing update tickets finished in ${
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
            description: `The update-tickets have been stopped at block ${lastBlockHeight} in the last update. Do you want to restart the update-tickets from block ${lastBlockHeight} (y/n)?`,
            message: 'Type y/n',
            required: true,
          },
        },
      },
      async (err, result) => {
        const c = (result.confirm as string).toLowerCase();
        if (c != 'y' && c != 'yes') {
          await updateTicketsData();
          return;
        }
        const sqlWhere = `CAST(height AS INT) >= ${lastBlockHeight}`;
        await updateTicketsData(sqlWhere);
      },
    );
  };
  if (!process.argv[2]) {
    if (lastBlockHeight > 0) {
      promptConfirmMessages();
    } else {
      await updateTicketsData();
    }
  } else {
    let sqlWhere = `CAST(height AS INT) = ${Number(process.argv[2])}`;
    if (process.argv[2]?.toLowerCase() === 'startat' && process.argv[3]) {
      sqlWhere = `CAST(height AS INT) >= ${Number(process.argv[3])}`;
    }
    await updateTicketsData(sqlWhere);
  }
}

createConnection().then(updateTickets);
