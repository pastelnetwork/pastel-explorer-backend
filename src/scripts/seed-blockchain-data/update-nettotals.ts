import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { NettotalsEntity, TNetTotals } from '../../entity/nettotals.entity';
import { getDateErrorFormat } from '../../utils/helpers';

export async function updateNettotalsInfo(
  connection: Connection,
  blockHeight: number,
  blockTime: number,
): Promise<boolean> {
  try {
    const [result] = await rpcClient.command<Array<TNetTotals>>([
      {
        method: 'getnettotals',
        parameters: [],
      },
    ]);
    const values: TNetTotals = {
      ...result,
      blockHeight,
      blockTime,
      timestamp: new Date().getTime(),
    };
    await connection.getRepository(NettotalsEntity).insert(values);
    return true;
  } catch (err) {
    console.error(
      `File update-nettotals.ts error >>> ${getDateErrorFormat()} >>>`,
      err,
    );
    return false;
  }
}
