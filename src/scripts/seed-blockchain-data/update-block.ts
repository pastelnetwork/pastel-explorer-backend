import { Connection } from 'typeorm';

import { BlockEntity } from '../../entity/block.entity';
import blockService from '../../services/block.service';
import transactionService from '../../services/transaction.service';
import { writeLastBlockHeightFile } from '../../utils/helpers';
import { cleanBlockData } from './clean-block-data';
import { createTopBalanceRank } from './create-top-rank';
import { batchCreateTransactions } from './db-utils';
import { getBlock, getDiffBetweenBlocks } from './get-blocks';
import {
  getAddressEvents,
  mapBlockFromRPCToJSON,
  mapTransactionFromRPCToJSON,
} from './mappers';
import {
  deleteReorgBlock,
  updateAddressEvents,
  updateNextBlockHashes,
} from './update-block-data';
import { BatchAddressEvents } from './update-database';
import { updateMasternodeList } from './update-masternode-list';
import { updateStatsMempoolInfo } from './update-mempoolinfo';
import { updateStatsMiningInfo } from './update-mining-info';

const fileName = 'lastUpdateBlockHeight.txt';

export const updateBlockByBlockHeight = async (
  connection: Connection,
  blockHeight: number,
): Promise<void> => {
  const blockRepo = connection.getRepository(BlockEntity);
  const { block, rawTransactions, vinTransactions } =
    await getBlock(blockHeight);
  if (block?.hash) {
    const incorrectBlock = await blockService.getIncorrectBlocksByHashAndHeight(
      block.hash,
      blockHeight.toString(),
    );

    if (incorrectBlock) {
      await deleteReorgBlock(parseInt(incorrectBlock.height), blockHeight);
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
  }
};

export const updateBlocksInfo = async (
  connection: Connection,
  startBlock: number,
  endBlock: number,
): Promise<void> => {
  for (let j = startBlock; j <= endBlock; j += 1) {
    const blockHeight = j;
    if (!process.argv[2]) {
      await writeLastBlockHeightFile(blockHeight.toString(), fileName);
    }
    console.log(`Processing block ${blockHeight}`);
    await cleanBlockData(blockHeight);
    await updateBlockByBlockHeight(connection, j);
  }
  await updateNextBlockHashes();
  await updateMasternodeList(connection);
  await createTopBalanceRank(connection);
  await updateStatsMiningInfo(connection);
  await updateStatsMempoolInfo(connection);
  await writeLastBlockHeightFile('0', fileName);
};

export const updateTimeBetweenBlocks = async (
  connection: Connection,
  startBlock: number,
  endBlock: number,
): Promise<void> => {
  for (let j = endBlock; j >= startBlock; j -= 1) {
    const blockHeight = j;
    await writeLastBlockHeightFile(blockHeight.toString(), fileName);
    console.log(`Processing block ${blockHeight}`);
    const currentBlock = await blockService.getBlockTimeByBlockHeight(
      blockHeight.toString(),
    );
    if (currentBlock) {
      const timeInMinutesBetweenBlocks = await getDiffBetweenBlocks(
        currentBlock.timestamp,
        currentBlock.height,
      );
      await blockService.updateTimeInMinutesBetweenBlocks(
        timeInMinutesBetweenBlocks,
        blockHeight,
      );
    }
  }
  await writeLastBlockHeightFile('0', fileName);
};
