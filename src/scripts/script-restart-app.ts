import dayjs from 'dayjs';
import pm2 from 'pm2';

import blockService from '../services/block.service';
import { TIME_CHECK_RESET_PM2 } from '../utils/constants';
import { getDateErrorFormat } from '../utils/helpers';

function restartPM2() {
  pm2.connect(error => {
    if (error) {
      console.error(`PM2 connect error >>> ${getDateErrorFormat()} >>>`, error);
      return;
    }
    try {
      pm2.restart('explorer-worker', () => {
        if (error) {
          console.error(
            `PM2 stop explorer-worker error >>> ${getDateErrorFormat()} >>>`,
            error,
          );
        }
      });
      pm2.restart('explorer-api', () => {
        if (error) {
          console.error(
            `PM2 stop explorer-api error >>> ${getDateErrorFormat()} >>>`,
            error,
          );
        }
      });
    } catch (err) {
      console.error(`PM2 restart error >> ${getDateErrorFormat()} >>>`, error);
    }
  });
}

export async function checkAndRestartPM2(): Promise<void> {
  const blockTime = await blockService.getLastTimeOfBlock();
  if (blockTime) {
    const lastSyncTime = dayjs(blockTime * 1000);
    const now = dayjs();
    const timeDiff = now.diff(lastSyncTime, 'minute');
    if (timeDiff > TIME_CHECK_RESET_PM2) {
      restartPM2();
    }
  }
}
