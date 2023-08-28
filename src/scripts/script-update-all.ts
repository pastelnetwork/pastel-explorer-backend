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
import { createTopBalanceRank } from './seed-blockchain-data/create-top-rank';
import { updateBlockByBlockHeight } from './seed-blockchain-data/update-block';
import { updateNextBlockHashes } from './seed-blockchain-data/update-block-data';
import { updateCascadeByBlockHeight } from './seed-blockchain-data/update-cascade';
import { updateMasternodeList } from './seed-blockchain-data/update-masternode-list';
import { updateStatsMempoolInfo } from './seed-blockchain-data/update-mempoolinfo';
import { updateStatsMiningInfo } from './seed-blockchain-data/update-mining-info';
import { updateNftByBlockHeight } from './seed-blockchain-data/updated-nft';
import { updateSenseRequestByBlockHeight } from './seed-blockchain-data/updated-sense-requests';
import { updateTicketsByBlockHeight } from './seed-blockchain-data/updated-ticket';

const fileName = 'lastUpdateBlockHeight.txt';

async function updateAllData(connection: Connection) {
  let lastBlockHeight = 0;
  if (!process.argv[2]) {
    lastBlockHeight = await readLastBlockHeightFile(fileName);
  }
  const updateBlocksData = async (startBlock: number, endBlock: number) => {
    const processingTimeStart = Date.now();
    for (let j = startBlock; j <= endBlock; j += 1) {
      console.log(`Processing block ${j}`);
      if (!process.argv[2]) {
        await writeLastBlockHeightFile(j.toString(), fileName);
      }
      await cleanBlockData(j);
      await updateBlockByBlockHeight(connection, j);
      const ticketTypeList = await updateTicketsByBlockHeight(connection, j);
      if (ticketTypeList.nft?.length) {
        await updateNftByBlockHeight(connection, j, ticketTypeList.nft);
      }
      if (ticketTypeList.sense.length) {
        await updateSenseRequestByBlockHeight(
          connection,
          j,
          ticketTypeList.sense,
        );
      }
      if (ticketTypeList.cascade.length) {
        await updateCascadeByBlockHeight(connection, j, ticketTypeList.cascade);
      }
    }
    await updateNextBlockHashes();
    await updateMasternodeList(connection);
    await createTopBalanceRank(connection);
    await updateStatsMiningInfo(connection);
    await updateStatsMempoolInfo(connection);
    await writeLastBlockHeightFile('0', fileName);
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
        const lastBlock = await blockService.getLastBlockInfo();
        const endBlock = Number(lastBlock.height);
        if (c != 'y' && c != 'yes') {
          await updateBlocksData(1, endBlock);
          return;
        }
        await updateBlocksData(lastBlockHeight, endBlock);
      },
    );
  };
  if (!process.argv[2]) {
    if (lastBlockHeight > 0) {
      promptConfirmMessages();
    } else {
      const lastBlock = await blockService.getLastBlockInfo();
      await updateBlocksData(1, Number(lastBlock.height));
    }
  } else {
    let startBlock = Number(process.argv[2]);
    let endBlock = Number(process.argv[2]);
    if (process.argv[2]?.toLowerCase() === 'startat' && process.argv[3]) {
      startBlock = Number(process.argv[3]);
      const lastBlock = await blockService.getLastBlockInfo();
      endBlock = Number(lastBlock.height);
    }
    await updateBlocksData(startBlock, endBlock);
  }
}

createConnection().then(updateAllData);
