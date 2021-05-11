import rpcClient from '../../components/rpc-client/rpc-client';

export async function getBlocks(
  startingBlockNumber: number,
  batchSize = 100,
  savedUnconfirmedTransactions: Array<{ id: string; }>,
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
  const blocks = (
    await rpcClient.command<BlockData[]>(getBlocksCommand)
  ).filter(v => v.code !== -1);
  const getTransactionsCommand = blocks
    .map(v =>
      v.tx.map(t => ({
        method: 'getrawtransaction',
        parameters: [t, 1],
      })),
    )
    .flat();
  const rawTransactions = await rpcClient.command<TransactionData[]>(
    getTransactionsCommand,
  );

  const [unconfirmedTransactionsIdx] = await rpcClient.command<
    Array<Record<string, { time: number; }>>
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
    blockhash: null,
  }));

  const vinTransactionsIds = [...rawTransactions, ...unconfirmedTransactions]
    .map(t => t.vin.map(v => v.txid))
    .flat()
    .filter(Boolean);

  const getVinTransactionsCommand = vinTransactionsIds.map(t => ({
    method: 'getrawtransaction',
    parameters: [t, 1],
  }));
  const batchAddressEventsChunks = [
    ...Array(Math.ceil(getVinTransactionsCommand.length / 1000)),
  ].map(() => getVinTransactionsCommand.splice(0, 1000));

  const vinTransactions = (
    await Promise.all(
      batchAddressEventsChunks.map(b =>
        rpcClient.command<TransactionData[]>(b),
      ),
    )
  ).flat();

  const blocksWithTransactions = blocks.map(b => ({
    ...b,
    transactions: b.tx.map(t => rawTransactions.find(tr => tr.txid === t)),
  }));

  return {
    blocks: blocksWithTransactions,
    rawTransactions,
    vinTransactions,
    unconfirmedTransactions,
  };
}
