import rpcClient from '../../components/rpc-client/rpc-client';
import blockService from '../../services/block.service';

export async function updateBlockConfirmations(): Promise<void> {
  const [info]: Record<'blocks', number>[] = await rpcClient.command([
    {
      method: 'getinfo',
      parameters: [],
    },
  ]);
  await blockService.updateConfirmations(info.blocks);
}

export async function updateNextBlockHashes(): Promise<void> {
  await blockService.updateNextBlockHashes();
}

export async function updateBlockHash(
  blockNumber: number,
  previousBlockHash: string,
): Promise<void> {
  const prevBlock = await blockService.getOneByIdOrHeight(
    blockNumber.toString(),
  );
  if (prevBlock.id !== previousBlockHash) {
    const block = await rpcClient.command<BlockData[]>([
      {
        method: 'getblock',
        parameters: [previousBlockHash],
      },
    ]);

    if (block.length > 0) {
      await blockService.updateBlockHash(
        block[0].hash,
        blockNumber,
        prevBlock.id,
      );
    }
  }
}
