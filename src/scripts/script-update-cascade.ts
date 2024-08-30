import 'dotenv/config';

import { exit } from 'process';
import prompt from 'prompt';
import { Connection } from 'typeorm';

import { dataSource } from '../datasource';
import { TicketEntity } from '../entity/ticket.entity';
import cascadeService from '../services/cascade.service';
import {
  isNumber,
  readLastBlockHeightFile,
  writeLastBlockHeightFile,
} from '../utils/helpers';
import { cleanBlockData } from './seed-blockchain-data/clean-block-data';
import {
  updateCascadeByBlockHeight,
  updateCascadeByTxId,
} from './seed-blockchain-data/update-cascade';

const fileName = 'lastUpdateCascadeByBlockHeight.txt';

async function updateCascades(connection: Connection) {
  const hideToBlock = Number(process.env.HIDE_TO_BLOCK || 0);
  let lastBlockHeight = 0;
  if (!process.argv[2]) {
    lastBlockHeight = await readLastBlockHeightFile(fileName);
  }
  const updateCascadesData = async (
    sqlWhere = `CAST(height AS INT) >= ${hideToBlock}`,
  ) => {
    const processingTimeStart = Date.now();
    const ticketRepo = connection.getRepository(TicketEntity);
    const blocksList = await ticketRepo
      .createQueryBuilder()
      .select('height, type')
      .where(sqlWhere)
      .andWhere(
        '((type = \'action-reg\' AND rawData LIKE \'%"action_type":"cascade"%\') OR (type = \'contract\' AND sub_type = \'cascade_multi_volume_metadata\'))',
      )
      .orderBy('CAST(height AS INT)')
      .groupBy('height')
      .getRawMany();

    for (let j = 0; j < blocksList.length; j += 1) {
      const blockHeight = Number(blocksList[j].height);
      if (!process.argv[2]) {
        await writeLastBlockHeightFile(blockHeight.toString(), fileName);
      }
      console.log(`Processing block ${blockHeight}`);
      await updateCascadeByBlockHeight(connection, blockHeight);
    }
    console.log(
      `Processing update cascade finished in ${
        Date.now() - processingTimeStart
      }ms`,
    );
    await writeLastBlockHeightFile('0', fileName);
    exit();
  };
  const updateCascadeByTransactionId = async (txId: string) => {
    const processingTimeStart = Date.now();
    console.log(`Processing txID ${txId}`);
    const cascade = await cascadeService.getByTxId(txId);
    if (cascade?.blockHeight) {
      await cleanBlockData(cascade.blockHeight);
      const newCascade = await cascadeService.getByTxId(txId);
      if (newCascade?.id) {
        await updateCascadeByTxId(connection, txId);
      }
    }
    console.log(
      `Processing update cascade finished in ${
        Date.now() - processingTimeStart
      }ms`,
    );
    exit();
  };
  const promptConfirmMessages = () => {
    prompt.start();

    prompt.message = '';
    prompt.delimiter = '';
    prompt.colors = false;

    prompt.get(
      {
        properties: {
          confirm: {
            pattern: /^(yes|no|y|n)$/gi,
            description: `The update-cascades have been stopped at block ${lastBlockHeight} in the last update. Do you want to restart the update-cascades from block ${lastBlockHeight} (y/n)?`,
            message: 'Type y/n',
            required: true,
          },
        },
      },
      async (err, result) => {
        const c = (result.confirm as string).toLowerCase();
        if (c != 'y' && c != 'yes') {
          await updateCascadesData();
          return;
        }
        const sqlWhere = `CAST(height AS INT) >= ${lastBlockHeight}`;
        await updateCascadesData(sqlWhere);
      },
    );
  };
  if (!process.argv[2]) {
    if (lastBlockHeight > 0) {
      promptConfirmMessages();
    } else {
      await updateCascadesData();
    }
  } else {
    if (
      isNumber(process.argv[2]) ||
      process.argv[2]?.toLowerCase() === 'startat'
    ) {
      let sqlWhere = `CAST(height AS INT) = ${Number(process.argv[2])}`;
      if (process.argv[2]?.toLowerCase() === 'startat' && process.argv[3]) {
        sqlWhere = `CAST(height AS INT) >= ${Number(process.argv[3])}`;
      }
      await updateCascadesData(sqlWhere);
    } else {
      await updateCascadeByTransactionId(process.argv[2]);
    }
  }
}

const createConnection = async () => {
  const connection = await dataSource;
  await updateCascades(connection);
};

createConnection()
  .then(async () => {
    // noop
  })
  .catch(error => console.log('TypeORM connection error: ', error));
