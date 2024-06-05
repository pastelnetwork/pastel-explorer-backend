import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';

import { rpcClient1 } from '../../components/rpc-client/rpc-client';
import addressEventsService from '../../services/address-events.service';
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
    const latestStatNotHasCoinSupply =
      await statsService.getLatestItemHNotHasTotalBurn();
    if (latestStatNotHasCoinSupply) {
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

        const fileName = path.join(
          process.env.TOTAL_BURNED_FILE,
          'total_burned_psl.txt',
        );
        fs.writeFileSync(fileName, totalBurnedPsl.toString());

        await statsService.updateTotalBurnByBlockHeights(totalBurnedPsl);
        const dir = process.env.TOTAL_BURNED_LOG_FOLDER;
        if (dir) {
          const newFolder = path.join(dir, dayjs().format('YYYYMMDD'));
          if (!fs.existsSync(newFolder)) {
            fs.mkdirSync(newFolder);
          }
          const fileName = path.join(
            newFolder,
            `total_burned_psl_${dayjs().format('YYYYMMDDHHmmss')}.txt`,
          );
          fs.writeFileSync(
            fileName,
            JSON.stringify({
              blockHeight: latestStatNotHasCoinSupply.blockHeight,
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
