import 'dotenv/config';

import { exit } from 'process';
import prompt from 'prompt';
import { Connection, createConnection } from 'typeorm';

import blockService from '../services/block.service';
import {
  readLastBlockHeightFile,
  writeLastBlockHeightFile,
} from '../utils/helpers';
import { cleanBlockData } from './seed-blockchain-data/clean-block-data';
import { updateTicketsByBlockHeight } from './seed-blockchain-data/updated-ticket';

const fileName = 'lastUpdateTicketsByBlockHeight.txt';

async function updateTickets(connection: Connection) {
  const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
  let lastBlockHeight = 0;
  if (!process.argv[2]) {
    lastBlockHeight = await readLastBlockHeightFile(fileName);
  }
  const updateTicketsData = async (startBlock: number, endBlock: number) => {
    const processingTimeStart = Date.now();
    for (let j = startBlock; j <= endBlock; j += 1) {
      const blockHeight = j;
      if (!process.argv[2]) {
        await writeLastBlockHeightFile(blockHeight.toString(), fileName);
      }
      console.log(`Processing block ${blockHeight}`);
      await cleanBlockData(blockHeight);
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
        const lastBlock = await blockService.getLastBlockInfo();
        const endBlock = Number(lastBlock.height);
        if (c != 'y' && c != 'yes') {
          await updateTicketsData(hideToBlock, endBlock);
          return;
        }
        await updateTicketsData(lastBlockHeight, endBlock);
      },
    );
  };
  if (!process.argv[2]) {
    if (lastBlockHeight > 0) {
      promptConfirmMessages();
    } else {
      const lastBlock = await blockService.getLastBlockInfo();
      await updateTicketsData(hideToBlock, Number(lastBlock.height));
    }
  } else {
    let startBlock = Number(process.argv[2]);
    let endBlock = Number(process.argv[2]);
    if (process.argv[2]?.toLowerCase() === 'startat' && process.argv[3]) {
      startBlock = Number(process.argv[3]);
      const lastBlock = await blockService.getLastBlockInfo();
      endBlock = Number(lastBlock.height);
    }
    await updateTicketsData(startBlock, endBlock);
  }
}

createConnection().then(updateTickets);
