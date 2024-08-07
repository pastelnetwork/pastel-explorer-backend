import dayjs from 'dayjs';

import rpcClient from '../../components/rpc-client/rpc-client';
import blockService from '../../services/block.service';

export const getDiffBetweenBlocks = async (timestamp, blockHeight) => {
  if (!blockHeight) {
    return null;
  }
  const prevBlock = await blockService.getBlockTimeByBlockHeight(
    (Number(blockHeight) - 1).toString(),
  );
  if (!prevBlock) {
    return 0;
  }
  const currentTime = dayjs(timestamp * 1000);
  const prevTime = dayjs(Number(prevBlock.timestamp) * 1000);
  return currentTime.diff(prevTime, 'minute', true);
};

export async function getBlocks(
  startingBlockNumber: number,
  batchSize = 100,
  savedUnconfirmedTransactions: Array<{ id: string; height: number | null; }>,
): Promise<{
  blocks: BlockData[];
  rawTransactions: TransactionData[];
  vinTransactions: TransactionData[];
  unconfirmedTransactions: TransactionData[];
}> {
  const getBlockHashCommands = Array(batchSize)
    .fill({
      method: 'getblockhash',
    })
    .map((v, idx) => ({
      ...v,
      parameters: [idx + startingBlockNumber],
    }));
  const blockHashes = await rpcClient.command<string[]>(getBlockHashCommands);
  const getBlocksCommand = blockHashes.map(v => ({
    method: 'getblock',
    parameters: [v],
  }));
  let blocks = (await rpcClient.command<BlockData[]>(getBlocksCommand)).filter(
    v => v.code !== -1,
  );
  if (!blocks[0]?.hash) {
    return {
      blocks: [],
      rawTransactions: [],
      vinTransactions: [],
      unconfirmedTransactions: [],
    };
  }
  const getTransactionsCommand = blocks
    .map(v =>
      v.tx?.map(t => ({
        method: 'getrawtransaction',
        parameters: [t, 1],
      })),
    )
    .flat();
  const resRawTransactions = await rpcClient.command<TransactionData[]>(
    getTransactionsCommand,
  );
  const rawTransactions = resRawTransactions.filter(t => t?.blockhash);
  if (rawTransactions.length) {
    const transactionVouts = rawTransactions[0].vout;
    let blockType = 'other';
    switch (transactionVouts.length) {
      case 2:
        blockType = 'cpu';
        break;
      case 3:
        blockType = 'pool';
        break;
    }
    blocks = blocks.map(block => ({
      ...block,
      type: blockType,
    }));
  }
  const [unconfirmedTransactionsIdx] = await rpcClient.command<
    Array<
      Record<
        string,
        { time: number; size: number; fee: number; height: number; }
      >
    >
  >([
    {
      method: 'getrawmempool',
      parameters: [true],
    },
  ]);
  const getUnconfirmedTransactionsCommand = Object.keys(
    unconfirmedTransactionsIdx,
  )
    .filter(tx => !savedUnconfirmedTransactions.find(t => t.id === tx))
    .map(t => ({
      method: 'getrawtransaction',
      parameters: [t, 1],
    }))
    .flat();
  const unconfirmedTransactions = (
    await rpcClient.command<TransactionData[]>(
      getUnconfirmedTransactionsCommand,
    )
  ).map(v => ({
    ...v,
    time: unconfirmedTransactionsIdx[v.txid].time,
    size: unconfirmedTransactionsIdx[v.txid].size,
    fee: unconfirmedTransactionsIdx[v.txid].fee,
    height: unconfirmedTransactionsIdx[v.txid].height,
    blockhash: null,
  }));
  const transactions = [];
  [...rawTransactions, ...unconfirmedTransactions].forEach(i => {
    if (i && i.vin) {
      transactions.push(i);
    }
  });
  const vinTransactionsIds = transactions
    .map(t => t.vin.map(v => v.txid))
    .flat()
    .filter(Boolean);

  const getVinTransactionsCommand = vinTransactionsIds.map(t => ({
    method: 'getrawtransaction',
    parameters: [t, 1],
  }));
  const batchAddressEventsChunks = [
    ...Array(Math.ceil(getVinTransactionsCommand.length / 100)),
  ].map(() => getVinTransactionsCommand.splice(0, 100));

  let vinTransactions: TransactionData[] = [];
  for (const b of batchAddressEventsChunks) {
    const result = (await rpcClient.command<TransactionData[]>(b)).flat();
    if (result.length) {
      vinTransactions = [...vinTransactions, ...result];
    }
  }

  const timeInMinutesBetweenBlocks = {};
  for (const block of blocks) {
    timeInMinutesBetweenBlocks[block.height] = await getDiffBetweenBlocks(
      block.time,
      block.height,
    );
  }

  const blocksWithTransactions = blocks.map(b => ({
    ...b,
    height: parseInt(b.height).toString(),
    transactions: b.tx.map(t => rawTransactions.find(tr => tr.txid === t)),
    totalTickets: -1,
    timeInMinutesBetweenBlocks: timeInMinutesBetweenBlocks[b.height],
  }));

  return {
    blocks: blocksWithTransactions,
    rawTransactions,
    vinTransactions,
    unconfirmedTransactions,
  };
}

export async function getBlock(startingBlockNumber: number): Promise<{
  block: BlockData;
  rawTransactions: TransactionData[];
  vinTransactions: TransactionData[];
}> {
  const blockHashes = await rpcClient.command<string[]>([
    {
      method: 'getblockhash',
      parameters: [startingBlockNumber],
    },
  ]);
  const getBlocksCommand = blockHashes.map(v => ({
    method: 'getblock',
    parameters: [v],
  }));
  let blocks = (await rpcClient.command<BlockData[]>(getBlocksCommand)).filter(
    v => v.code !== -1,
  );
  const getTransactionsCommand = blocks
    .map(v =>
      v.tx.map(t => ({
        method: 'getrawtransaction',
        parameters: [t, 1],
      })),
    )
    .flat();
  const resRawTransactions = await rpcClient.command<TransactionData[]>(
    getTransactionsCommand,
  );
  const rawTransactions = resRawTransactions.filter(t => t?.blockhash);
  if (rawTransactions.length) {
    const transactionVouts = rawTransactions[0].vout;
    let blockType = 'other';
    switch (transactionVouts.length) {
      case 2:
        blockType = 'cpu';
        break;
      case 3:
        blockType = 'pool';
        break;
    }
    blocks = blocks.map(block => ({
      ...block,
      type: blockType,
    }));
  }

  const transactions = [];
  [...rawTransactions].forEach(i => {
    if (i && i.vin) {
      transactions.push(i);
    }
  });
  const vinTransactionsIds = transactions
    .map(t => t.vin.map(v => v.txid))
    .flat()
    .filter(Boolean);

  const getVinTransactionsCommand = vinTransactionsIds.map(t => ({
    method: 'getrawtransaction',
    parameters: [t, 1],
  }));
  const batchAddressEventsChunks = [
    ...Array(Math.ceil(getVinTransactionsCommand.length / 100)),
  ].map(() => getVinTransactionsCommand.splice(0, 100));

  let vinTransactions: TransactionData[] = [];
  for (const b of batchAddressEventsChunks) {
    const result = (await rpcClient.command<TransactionData[]>(b)).flat();
    if (result.length) {
      vinTransactions = [...vinTransactions, ...result];
    }
  }

  const timeInMinutesBetweenBlocks = await getDiffBetweenBlocks(
    blocks[0].time,
    blocks[0].height,
  );
  return {
    block: {
      ...blocks[0],
      height: parseInt(blocks[0].height).toString(),
      transactions: blocks[0].tx.map(t =>
        rawTransactions.find(tr => tr.txid === t),
      ),
      totalTickets: -1,
      timeInMinutesBetweenBlocks,
    },
    rawTransactions,
    vinTransactions,
  };
}
