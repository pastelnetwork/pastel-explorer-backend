import 'dotenv/config';

import { exit } from 'process';
import prompt from 'prompt';
import { Connection, createConnection } from 'typeorm';

import blockService from '../services/block.service';
import { readLastBlockHeightFile } from '../utils/helpers';
import { updateCoinSupplyAndTotalBurnedData } from './seed-blockchain-data/update-stats';

const fileName = 'lastCoinSupplyUpdateBlockHeight.txt';

async function updateBlocks(connection: Connection) {
  let lastBlockHeight = 0;
  if (!process.argv[2]) {
    lastBlockHeight = await readLastBlockHeightFile(fileName);
  }
  const lastBlock = await blockService.getLastBlockInfo();

  const updateCoinSupplyData = async (startBlock: number, endBlock: number) => {
    const processingTimeStart = Date.now();
    await updateCoinSupplyAndTotalBurnedData(connection, startBlock, endBlock);
    console.log(
      `Processing update blocks finished in ${
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
            description: `The update-blocks have been stopped at block ${lastBlockHeight} in the last update. Do you want to restart the update-blocks from block ${lastBlockHeight} (y/n)?`,
            message: 'Type y/n',
            required: true,
          },
        },
      },
      async (err, result) => {
        const c = (result.confirm as string).toLowerCase();
        const endBlock = Number(lastBlock.height);
        if (c != 'y' && c != 'yes') {
          await updateCoinSupplyData(1, endBlock);
          return;
        }
        await updateCoinSupplyData(lastBlockHeight, endBlock);
      },
    );
  };
  if (!process.argv[2]) {
    if (lastBlockHeight > 0) {
      promptConfirmMessages();
    } else {
      await updateCoinSupplyData(1, Number(lastBlock.height));
    }
  } else {
    let startBlock = Number(process.argv[2]);
    let endBlock = Number(process.argv[2]);
    if (process.argv[2]?.toLowerCase() === 'startat' && process.argv[3]) {
      startBlock = Number(process.argv[3]);
      endBlock = Number(lastBlock.height);
      await updateCoinSupplyData(startBlock, endBlock);
    }
  }
}

createConnection().then(updateBlocks);
