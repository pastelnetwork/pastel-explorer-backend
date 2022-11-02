import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { HashrateEntity, THashrate } from '../../entity/hashrate.entity';
import { getDateErrorFormat } from '../../utils/helpers';

export async function updateHashrate(connection: Connection): Promise<boolean> {
  try {
    const results: THashrate = {
      networksolps5: 0,
      networksolps10: 0,
      networksolps25: 0,
      networksolps50: 0,
      networksolps100: 0,
      networksolps500: 0,
      networksolps1000: 0,
    };
    const list = [5, 10, 25, 50, 100, 500, 1000];
    for (let i = 0; i < list.length; i++) {
      const [result] = await rpcClient.command<Array<number>>([
        {
          method: 'getnetworksolps',
          parameters: [list[i]],
        },
      ]);
      results[`networksolps${list[i]}`] = result;
    }
    const values: THashrate = {
      ...results,
      timestamp: new Date().getTime(),
    };
    await connection.getRepository(HashrateEntity).insert(values);
    return true;
  } catch (err) {
    console.error(
      `File update-hashrate.ts error >>> ${getDateErrorFormat()} >>>`,
      err,
    );
    return false;
  }
}
