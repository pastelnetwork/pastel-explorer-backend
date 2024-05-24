import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';

import { rpcClient1 } from '../../components/rpc-client/rpc-client';
import addressEventsService from '../../services/address-events.service';
import blockService from '../../services/block.service';
import statsService from '../../services/stats.service';

interface ISnStatistics {
  address: string;
  totalFeesReceivedPat: number;
  totalFeesReceived: number;
  feePayingTransactionCount: number;
}

interface IGenerateReport {
  summary: {
    totalBurnedInDustTransactionsPat: number;
    totalBurnedInDustTransactions: number;
    totalFeesPaidToSNsPat: number;
    totalFeesPaidToSNs: number;
  };
  snStatistics: ISnStatistics[];
  addressCoinBurn: {
    [key: string]: number;
  };
}
let isUpdating = false;
export async function updateTotalBurnedFile() {
  if (isUpdating) {
    return;
  }
  try {
    isUpdating = true;
    const processingTimeStart = Date.now();
    const latestStatHasCoinSupply =
      await statsService.getLatestItemHasTotalBurn();
    const lastBlockInfo = await blockService.getLastBlockInfo();
    if (
      Number(lastBlockInfo.height) > Number(latestStatHasCoinSupply.blockHeight)
    ) {
      const [generateReport] = await rpcClient1.command<Array<IGenerateReport>>(
        [
          {
            method: 'generate-report',
            parameters: ['fees-and-burn'],
          },
        ],
      );
      if (generateReport?.summary) {
        const data = await addressEventsService.getBalanceHistory(
          'PtpasteLBurnAddressXXXXXXXXXXbJ5ndd',
        );
        const burnAddressBalance = Object.values(
          generateReport.addressCoinBurn,
        ).reduce((a, b) => Number(a) + Number(b), 0);
        const totalBurnedPsl =
          Number(generateReport.summary.totalBurnedInDustTransactions) +
          Number(burnAddressBalance) / 100000 +
          data.totalReceived; // 100000 # patoshis in 1 PSL

        await statsService.updateTotalBurnByBlockHeights(
          Number(latestStatHasCoinSupply.blockHeight) + 1,
          totalBurnedPsl,
        );
        const dir = process.env.TOTAL_BURNED_LOG_FOLDER;
        if (dir) {
          const latestStat = await statsService.getLatestItemHasTotalBurn();
          const fileName = path.join(
            dir,
            `total_burned_psl_${dayjs().format('YYYYMMDDHHmmss')}.txt`,
          );
          fs.writeFileSync(
            fileName,
            JSON.stringify({
              blockHeight: `${Number(latestStatHasCoinSupply.blockHeight) + 1} - ${latestStat.blockHeight}`,
              totalBurnedPsl,
              data: JSON.stringify(generateReport),
            }),
          );
        }

        console.log(
          `Processing update Total Burned File finished in ${
            Date.now() - processingTimeStart
          }ms`,
        );
      }
    }
  } catch (error) {
    console.error('Update Total Burned File error', error);
  }
  isUpdating = false;
}
