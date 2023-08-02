import 'dotenv/config';

import { exit } from 'process';
import prompt from 'prompt';
import { Connection, createConnection } from 'typeorm';

import { TicketEntity } from '../entity/ticket.entity';
import {
  isNumber,
  readLastBlockHeightFile,
  writeLastBlockHeightFile,
} from '../utils/helpers';
import {
  updateNftByBlockHeight,
  updateNftByTxID,
} from './seed-blockchain-data/updated-nft';

const fileName = 'lastUpdateNftByBlockHeight.txt';

async function updateNfts(connection: Connection) {
  let lastBlockHeight = 0;
  if (!process.argv[2]) {
    lastBlockHeight = await readLastBlockHeightFile(fileName);
  }
  const updateNftsData = async (sqlWhere = 'height > 0') => {
    const processingTimeStart = Date.now();
    const ticketRepo = connection.getRepository(TicketEntity);
    const blocksList = await ticketRepo
      .createQueryBuilder()
      .select('height')
      .where(sqlWhere)
      .andWhere("type = 'nft-reg'")
      .orderBy('CAST(height AS INT)')
      .groupBy('height')
      .getRawMany();

    for (let j = 0; j < blocksList.length; j += 1) {
      const blockHeight = Number(blocksList[j].height);
      if (!process.argv[2]) {
        await writeLastBlockHeightFile(blockHeight.toString(), fileName);
      }
      console.log(`Processing block ${blockHeight}`);
      await updateNftByBlockHeight(connection, blockHeight);
    }
    console.log(
      `Processing update NFTs finished in ${
        Date.now() - processingTimeStart
      }ms`,
    );
    await writeLastBlockHeightFile('0', fileName);
    exit();
  };
  const updateNftByTransactionId = async (txId: string) => {
    const processingTimeStart = Date.now();
    console.log(`Processing txID ${txId}`);
    await updateNftByTxID(connection, process.argv[2]);
    console.log(
      `Processing update NFT finished in ${Date.now() - processingTimeStart}ms`,
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
            description: `The update-nfts have been stopped at block ${lastBlockHeight} in the last update. Do you want to restart the update-nfts from block ${lastBlockHeight} (y/n)?`,
            message: 'Type y/n',
            required: true,
          },
        },
      },
      async (err, result) => {
        const c = (result.confirm as string).toLowerCase();
        if (c != 'y' && c != 'yes') {
          await updateNftsData();
          return;
        }
        const sqlWhere = `CAST(height AS INT) >= ${lastBlockHeight}`;
        await updateNftsData(sqlWhere);
      },
    );
  };
  if (!process.argv[2]) {
    if (lastBlockHeight > 0) {
      promptConfirmMessages();
    } else {
      await updateNftsData();
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
      await updateNftsData(sqlWhere);
    } else {
      await updateNftByTransactionId(process.argv[2]);
    }
  }
}

createConnection().then(updateNfts);
