import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { NettotalsEntity, TNetTotals } from '../../entity/nettotals.entity';

export async function updateNettotalsInfo(
  connection: Connection,
): Promise<boolean> {
  //   async function validateDuplicatedMempoolInfo(validateFields: TNetTotals) {
  //     const sqlResult = await connection.getRepository(NettotalsEntity).find({
  //       take: 1,
  //       order: {
  //         timestamp: 'DESC',
  //       },
  //     });
  //     const data = sqlResult && sqlResult.length ? sqlResult[0] : null;
  //     if (
  //       data &&
  //       data.bytes === validateFields.bytes &&
  //       data.size === validateFields.size &&
  //       data.usage === validateFields.usage
  //     ) {
  //       return false;
  //     }
  //     return true;
  //   }

  const [result] = await rpcClient.command<Array<TNetTotals>>([
    {
      method: 'getnettotals',
      parameters: [],
    },
  ]);
  const values: TNetTotals = {
    ...result,
    timestamp: new Date().getTime(),
  };
  await connection.getRepository(NettotalsEntity).insert(values);
  return true;
}
