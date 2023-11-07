import 'dotenv/config';

import { exit } from 'process';
import prompt from 'prompt';
import { Connection, createConnection } from 'typeorm';

import { BlockEntity } from '../entity/block.entity';
import addressEventsService from '../services/address-events.service';
import blockService from '../services/block.service';
import transactionService from '../services/transaction.service';
import {
  readLastBlockHeightFile,
  writeLastBlockHeightFile,
} from '../utils/helpers';
import { createTopBalanceRank } from './seed-blockchain-data/create-top-rank';
import { batchCreateTransactions } from './seed-blockchain-data/db-utils';
import { getBlock } from './seed-blockchain-data/get-blocks';
import {
  getAddressEvents,
  mapBlockFromRPCToJSON,
  mapTransactionFromRPCToJSON,
} from './seed-blockchain-data/mappers';
import {
  deleteReorgBlock,
  updateAddressEvents,
  updateNextBlockHashes,
} from './seed-blockchain-data/update-block-data';
import { updateCascadeByBlockHeight } from './seed-blockchain-data/update-cascade';
import { BatchAddressEvents } from './seed-blockchain-data/update-database';
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
  const updateBlocksData = async (sqlWhere = null) => {
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
        await writeLastBlockHeightFile(blockHeight.toString(), fileName);
      }
      console.log(`Processing block ${blockHeight}`);
      const { block, rawTransactions, vinTransactions } = await getBlock(
        blockHeight,
      );
      if (block?.hash) {
        const incorrectBlock =
          await blockService.getIncorrectBlocksByHashAndHeight(
            block.hash,
            blocksList[j].height,
          );

        if (incorrectBlock) {
          await deleteReorgBlock(parseInt(incorrectBlock.height), blockHeight);
        }

        const transactions = await transactionService.getAllIdByBlockHeight(
          blockHeight,
        );
        if (transactions.length) {
          const txIds = transactions.map(t => t.id);
          await addressEventsService.deleteAllByTxIds(txIds);
          await transactionService.deleteTransactionByBlockHash(
            blocksList[j].height,
          );
        }

        const batchBlock = [block].map(mapBlockFromRPCToJSON);
        await blockRepo.save(batchBlock);
        const batchAddressEvents = rawTransactions.reduce<BatchAddressEvents>(
          (acc, transaction) => [
            ...acc,
            ...getAddressEvents(transaction, vinTransactions),
          ],
          [],
        );
        const batchTransactions = rawTransactions.map(t =>
          mapTransactionFromRPCToJSON(t, JSON.stringify(t), batchAddressEvents),
        );
        if (batchTransactions?.length) {
          for (let i = 0; i < batchTransactions.length; i++) {
            const addresses = batchAddressEvents
              .filter(e => e.transactionHash === batchTransactions[i].id)
              .map(e => e.address);
            if (addresses?.length) {
              await addressEventsService.deleteEventAndAddressNotInTransaction(
                batchTransactions[i].id,
                addresses,
              );
            }
          }
        }

        const currentTransactions = await transactionService.getIdByHash(
          block.hash,
        );
        const transactionsLength =
          currentTransactions.length > batchTransactions.length
            ? currentTransactions.length
            : batchTransactions.length;
        for (let i = 0; i < transactionsLength; i++) {
          if (batchTransactions[i]?.id) {
            await batchCreateTransactions(connection, [
              { ...batchTransactions[i], ticketsTotal: -1 },
            ]);
            await updateAddressEvents(connection, [
              {
                id: batchTransactions[i].id,
                blockHash: block.hash,
                height: blockHeight,
              },
            ]);
          }
          if (currentTransactions[i]?.id) {
            const transaction = batchTransactions.find(
              t => t.id === currentTransactions[i]?.id,
            );
            if (!transaction) {
              await transactionService.updateBlockHashIsNullByHash(
                currentTransactions[i].id,
              );
            }
          }
        }

        await updateTicketsByBlockHeight(connection, blockHeight);
        await updateCascadeByBlockHeight(connection, blockHeight);
        await updateNftByBlockHeight(connection, blockHeight);
        await updateSenseRequestByBlockHeight(connection, blockHeight);
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
        if (c != 'y' && c != 'yes') {
          await updateBlocksData();
          return;
        }
        const sqlWhere = `CAST(height AS INT) >= ${lastBlockHeight}`;
        await updateBlocksData(sqlWhere);
      },
    );
  };
  if (!process.argv[2]) {
    if (lastBlockHeight > 0) {
      promptConfirmMessages();
    } else {
      await updateBlocksData();
    }
  } else {
    let sqlWhere = `CAST(height AS INT) = ${Number(process.argv[2])}`;
    if (process.argv[2]?.toLowerCase() === 'startat' && process.argv[3]) {
      sqlWhere = `CAST(height AS INT) >= ${Number(process.argv[3])}`;
    }
    await updateBlocksData(sqlWhere);
  }
}

createConnection().then(updateAllData);
