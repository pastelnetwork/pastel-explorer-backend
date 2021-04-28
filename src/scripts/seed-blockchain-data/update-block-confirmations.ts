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
