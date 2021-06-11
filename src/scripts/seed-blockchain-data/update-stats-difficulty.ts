import { Connection } from 'typeorm';

import rpcClient from '../../components/rpc-client/rpc-client';
import { StatsDifficultyEntity } from '../../entity/statsdifficulty.entity';

interface TValidateFields {
  solutions: number;
  difficulty: number;
}

export async function updateStatsDifficulty(connection: Connection): Promise<boolean> {
  async function validateDuplicatedStatisticInfo(
    validateFields: TValidateFields,
  ): Promise<boolean> {
    const sqlResult = await connection.getRepository(StatsDifficultyEntity).find({
      take: 1,
      order: {
        timestamp: 'DESC',
      }
    })
    if (sqlResult.length && sqlResult[0]) {
      if (
        validateFields.solutions === sqlResult[0].solutions &&
        validateFields.difficulty === sqlResult[0].difficulty
      ) {
        return false
      }
    }
    return true
  }

  const getDifficulty = rpcClient.command<
    Array<number>
  >([
    {
      method: 'getdifficulty',
      parameters: [],
    },
  ]);
  const getNetworkHashps = rpcClient.command<
    Array<number>
  >(
    [{
    method: 'getnetworkhashps',
    parameters: [],
  }])
  const [[difficulty], [solutions]] = await Promise.all([
    getDifficulty,
    getNetworkHashps,
  ]);
  const isCreate = await validateDuplicatedStatisticInfo({ difficulty: Number(difficulty), solutions });
  if (isCreate) {
    const stats: StatsDifficultyEntity = {
      solutions: solutions,
      difficulty: Number(difficulty),
      timestamp: Date.now(),
    };
    await connection.getRepository(StatsDifficultyEntity).insert(stats);
  }
  return true;
}
