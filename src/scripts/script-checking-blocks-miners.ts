import axios from 'axios';
import { Connection, createConnection } from 'typeorm';

import { BlockEntity } from '../entity/block.entity';
import { sendMail } from '../services/mailer';
import {
  ADMIN_EMAIL,
  MINER_POOL_URL,
  MINER_POOL_URL1,
  WARNING_BLOCK_SUBJECT,
  WARNING_MINER_SUBJECT,
} from '../utils/constants';

const TIME_OUT = 10 * 60;

async function checkingBLocksMinersScript(connection: Connection) {
  try {
    const blockRepo = connection.getRepository(BlockEntity);
    const { timestamp } = await blockRepo
      .createQueryBuilder('block')
      .select(['timestamp'])
      .orderBy({
        timestamp: 'DESC',
      })
      .limit(1)
      .getRawOne();
    const currentTime = Math.round(new Date().getTime() / 1000);
    if (currentTime - timestamp > TIME_OUT) {
      console.log('send email');
      await sendMail({ to: ADMIN_EMAIL, subject: WARNING_BLOCK_SUBJECT });
    }
    let isValid = false;
    const { data } = await axios.get(MINER_POOL_URL);
    if (data.includes('pure-table-odd')) {
      isValid = true;
    }
    if (!isValid) {
      const { data: data1 } = await axios.get(MINER_POOL_URL1);
      if (data1.includes('pure-table-odd')) {
        isValid = true;
      }
    }
    if (!isValid) {
      await sendMail({ to: ADMIN_EMAIL, subject: WARNING_MINER_SUBJECT });
    }
  } catch (error) {
    console.error('Checking minner and blocks error >>>', error.message);
  }
}

export const checkingBLocksMiners = (): Promise<void> =>
  createConnection().then(checkingBLocksMinersScript);
