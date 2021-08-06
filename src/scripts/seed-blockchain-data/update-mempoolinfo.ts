import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import {
  MempoolInfoEntity,
  TMempoolInfo,
} from '../../entity/mempoolinfo.entity';

export async function updateStatsMempoolInfo(
  connection: Connection,
): Promise<boolean> {
  async function validateDuplicatedMempoolInfo(validateFields: TMempoolInfo) {
    const sqlResult = await connection.getRepository(MempoolInfoEntity).find({
      take: 1,
      order: {
        timestamp: 'DESC',
      },
    });
    const data = sqlResult && sqlResult.length ? sqlResult[0] : null;
    if (
      data &&
      data.bytes === validateFields.bytes &&
      data.size === validateFields.size &&
      data.usage === validateFields.usage
    ) {
      return false;
    }
    return true;
  }

  const [result] = await rpcClient.command<Array<TMempoolInfo>>([
    {
      method: 'getmempoolinfo',
      parameters: [],
    },
  ]);
  const data: TMempoolInfo = {
    ...result,
  };
  if (validateDuplicatedMempoolInfo(data)) {
    const values: TMempoolInfo = {
      ...data,
      timestamp: new Date().getTime(),
    };
    await connection.getRepository(MempoolInfoEntity).insert(values);
  }
  return true;
}
