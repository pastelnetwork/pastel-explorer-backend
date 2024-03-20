import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { TMempoolInfo } from '../../entity/mempoolinfo.entity';
import { MiningInfoEntity, TMiningInfo } from '../../entity/mininginfo.entity';
import { getDateErrorFormat } from '../../utils/helpers';

type TValidateFields = {
  miningBlocks: number;
};

export async function updateStatsMiningInfo(
  connection: Connection,
): Promise<boolean> {
  async function validateDuplicatedMiningInfo(validateFields: TValidateFields) {
    const sqlResult = await connection.getRepository(MiningInfoEntity).find({
      take: 1,
      order: {
        timestamp: 'DESC',
      },
    });
    if (sqlResult.length && sqlResult[0].blocks) {
      if (validateFields.miningBlocks === sqlResult[0].blocks) {
        return false;
      }
    }
    return true;
  }

  try {
    const [miningInfoRespone] = await rpcClient.command<Array<TMiningInfo>>([
      {
        method: 'getmininginfo',
        parameters: [],
      },
    ]);
    const isCreate = await validateDuplicatedMiningInfo({
      miningBlocks: miningInfoRespone.blocks,
    });
    if (isCreate) {
      const [result] = await rpcClient.command<Array<TMempoolInfo>>([
        {
          method: 'getmempoolinfo',
          parameters: [],
        },
      ]);
      const generate = miningInfoRespone.generate
        ? miningInfoRespone.generate?.toString()
        : '';
      const miningInfo: MiningInfoEntity = {
        blocks: miningInfoRespone.blocks,
        currentblocksize: miningInfoRespone.currentblocksize,
        currentblocktx: miningInfoRespone.currentblocktx,
        difficulty: miningInfoRespone.difficulty,
        errors: miningInfoRespone.errors,
        genproclimit: miningInfoRespone.genproclimit,
        localsolps: miningInfoRespone.localsolps,
        networksolps: miningInfoRespone.networksolps,
        networkhashps: miningInfoRespone.networkhashps,
        pooledtx: result.size || 0,
        testnet: miningInfoRespone?.testnet || 0,
        chain: miningInfoRespone.chain,
        generate,
        timestamp: new Date().getTime(),
      };
      await connection.getRepository(MiningInfoEntity).insert(miningInfo);
    }
    return true;
  } catch (err) {
    console.error(
      `File update-mining-info.ts error >>> ${getDateErrorFormat()} >>>`,
      err,
    );
    return false;
  }
}
