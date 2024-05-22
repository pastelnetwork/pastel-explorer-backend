import fs from 'fs';
import path from 'path';

import { rpcClient1 } from '../../components/rpc-client/rpc-client';
import addressEventsService from '../../services/address-events.service';

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
    const processingTimeStart = Date.now();
    isUpdating = true;
    let totalBurnedPsl = 0;
    const [generateReport] = await rpcClient1.command<Array<IGenerateReport>>([
      {
        method: 'generate-report',
        parameters: ['fees-and-burn'],
      },
    ]);
    if (generateReport.summary) {
      const data = await addressEventsService.getBalanceHistory(
        'PtpasteLBurnAddressXXXXXXXXXXbJ5ndd',
      );

      const burnAddressBalance = Object.values(
        generateReport.addressCoinBurn,
      ).reduce((a, b) => Number(a) + Number(b), 0);
      totalBurnedPsl =
        Number(generateReport.summary.totalBurnedInDustTransactions) +
        Number(burnAddressBalance) / 100000 +
        data.totalReceived; // 100000 # patoshis in 1 PSL
    }
    const dir = process.env.TOTAL_BURNED_FILE;
    const fileName = path.join(dir, 'total_burned_psl.txt');
    fs.writeFileSync(fileName, totalBurnedPsl.toString());
    console.log(
      `Processing update Total Burned File finished in ${
        Date.now() - processingTimeStart
      }ms`,
    );
  } catch (error) {
    console.error('Update Total Burned File error', error);
  }
  isUpdating = false;
}
