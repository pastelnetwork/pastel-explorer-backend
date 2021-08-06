import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import {
  RawMemPoolInfoEntity,
  TRawMempool,
  TRawMempoolInfo,
} from '../../entity/rawmempoolinfo.entity';

type TValidateFields = {
  transactionid: string;
  time: number;
};

export async function updateStatsRawMemPoolInfo(
  connection: Connection,
): Promise<boolean> {
  async function validateDuplicatedRawmempoolInfo(
    validateFields: TValidateFields,
  ) {
    const sqlResult = await connection
      .getRepository(RawMemPoolInfoEntity)
      .find({
        take: 1,
        order: {
          timestamp: 'DESC',
        },
        where: {
          transactionid: validateFields.transactionid,
          time: validateFields.time,
        },
      });
    return sqlResult.length ? false : true;
  }

  const [result] = await rpcClient.command<Array<TRawMempoolInfo>>([
    {
      method: 'getrawmempool',
      parameters: [true],
    },
  ]);
  const keys = Object.keys(result);
  if (keys.length) {
    const transactionid = keys[0];
    const rawmempool = result[transactionid];
    const data: TRawMempool = {
      transactionid: transactionid,
      size: rawmempool.size,
      fee: rawmempool.fee,
      time: rawmempool.time,
      height: rawmempool.height,
      startingpriority: rawmempool.startingpriority,
      currentpriority: rawmempool.currentpriority,
      depends: rawmempool.depends,
    };
    if (
      validateDuplicatedRawmempoolInfo({
        transactionid: transactionid,
        time: data.time,
      })
    ) {
      const depends = JSON.stringify(data.depends);
      const values: RawMemPoolInfoEntity = {
        transactionid: transactionid,
        size: data.size,
        fee: data.fee,
        time: data.time,
        height: data.height,
        startingpriority: data.startingpriority,
        currentpriority: data.currentpriority,
        depends,
        timestamp: new Date().getTime(),
      };
      await connection.getRepository(RawMemPoolInfoEntity).insert(values);
    }
  }
  return true;
}
