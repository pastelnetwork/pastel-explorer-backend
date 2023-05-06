import 'dotenv/config';

import { exit } from 'process';
import prompt from 'prompt';
import { Connection, createConnection } from 'typeorm';

import { BlockEntity } from '../entity/block.entity';
import addressEventsService from '../services/address-events.service';
import blockService from '../services/block.service';
import senseRequestsService from '../services/senserequests.service';
import ticketService from '../services/ticket.service';
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
  updateAddressEvents,
  updateNextBlockHashes,
} from './seed-blockchain-data/update-block-data';
import { BatchAddressEvents } from './seed-blockchain-data/update-database';
import { updateMasternodeList } from './seed-blockchain-data/update-masternode-list';
import { updateStatsMempoolInfo } from './seed-blockchain-data/update-mempoolinfo';
import { updateStatsMiningInfo } from './seed-blockchain-data/update-mining-info';
import { updateRegisteredCascadeFiles } from './seed-blockchain-data/update-registered-cascade-files';
import { updateRegisteredSenseFiles } from './seed-blockchain-data/update-registered-sense-files';
import { updateTickets } from './seed-blockchain-data/updated-ticket';

const fileName = 'lastUpdateBlockHeight.txt';

async function updateBlocks(connection: Connection) {
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
        const incorrectBlocks =
          await blockService.getIncorrectBlocksByHashAndHeight(
            block.hash,
            blocksList[j].height,
          );
        for (let k = 0; k < incorrectBlocks.length; k++) {
          await senseRequestsService.deleteTicketByBlockHash(
            incorrectBlocks[k].id,
          );
          const transactions = await transactionService.getAllByBlockHash(
            incorrectBlocks[k].id,
          );
          for (let i = 0; i < transactions.length; i++) {
            await addressEventsService.deleteEventAndAddressByTransactionHash(
              transactions[i].id,
            );
          }
          await transactionService.deleteTransactionByBlockHash(
            incorrectBlocks[k].id,
          );
          await blockService.deleteBlockByHash(incorrectBlocks[k].id);
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

        const txIds = batchTransactions?.map(transaction => transaction.id);
        if (txIds?.length) {
          await addressEventsService.deleteAllByTxIds(txIds);
          await transactionService.deleteAllTransactionByTxIds(txIds);
        }
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
            await batchCreateTransactions(connection, [batchTransactions[i]]);
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
        await blockService.updateTotalTicketsForBlock([], blockHeight);
        await ticketService.deleteTicketByBlockHeight(blockHeight);
        await senseRequestsService.deleteTicketByBlockHeight(blockHeight);
        await updateTickets(connection, block.tx, blockHeight);
        // await updateRegisteredCascadeFiles(
        //   connection,
        //   Number(block.height),
        //   block.time * 1000,
        // );
        // await updateRegisteredSenseFiles(
        //   connection,
        //   Number(block.height),
        //   block.time * 1000,
        // );
      }
    }
    await updateNextBlockHashes();
    await updateMasternodeList(connection);
    await createTopBalanceRank(connection);
    await updateStatsMiningInfo(connection);
    await updateStatsMempoolInfo(connection);
    console.log(
      `Processing update blocks finished in ${
        Date.now() - processingTimeStart
      }ms`,
    );
    await writeLastBlockHeightFile('0', fileName);
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

createConnection().then(updateBlocks);
