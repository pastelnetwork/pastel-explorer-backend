import dayjs from 'dayjs';
import pm2 from 'pm2';

import rpcClient from '../components/rpc-client/rpc-client';
import blockService from '../services/block.service';
import { TIME_CHECK_RESET_PM2 } from '../utils/constants';
import { getDateErrorFormat } from '../utils/helpers';

function restartPM2() {
  pm2.connect(error1 => {
    if (error1) {
      console.error(
        `PM2 connect error >>> ${getDateErrorFormat()} >>>`,
        error1,
      );
      return;
    }
    try {
      pm2.restart('explorer-worker', error2 => {
        if (error2) {
          console.error(
            `PM2 stop explorer-worker error >>> ${getDateErrorFormat()} >>>`,
            error2,
          );
        }
      });
      pm2.restart('explorer-api', error3 => {
        if (error3) {
          console.error(
            `PM2 stop explorer-api error >>> ${getDateErrorFormat()} >>>`,
            error3,
          );
        }
      });
    } catch (error4) {
      console.error(`PM2 restart error >> ${getDateErrorFormat()} >>>`, error4);
    }
  });
}

export async function checkAndRestartPM2(): Promise<void> {
  pm2.describe('explorer-worker', (error1, processDescriptionList1) => {
    let explorerWorkerStatus = 'online';
    if (error1 || processDescriptionList1[0].pm2_env.status !== 'online') {
      explorerWorkerStatus = 'offline';
    }
    pm2.describe('explorer-api', (error2, processDescriptionList2) => {
      let explorerApiStatus = 'online';
      if (error2 || processDescriptionList2[0].pm2_env.status !== 'online') {
        explorerApiStatus = 'offline';
      }
      if (explorerWorkerStatus !== 'online' || explorerApiStatus !== 'online') {
        (async () => {
          const blockInfo = await blockService.getLastBlockInfo();
          if (blockInfo?.height) {
            const appInfo = await rpcClient.command<IAppInfo>([
              {
                method: 'getinfo',
                parameters: [],
              },
            ]);
            if (appInfo[0].height > parseInt(blockInfo.height)) {
              const lastSyncTime = dayjs(blockInfo.timestamp * 1000);
              const now = dayjs();
              const timeDiff = now.diff(lastSyncTime, 'minute');
              if (timeDiff > TIME_CHECK_RESET_PM2) {
                restartPM2();
              }
            }
          }
        })();
      }
    });
  });
}
