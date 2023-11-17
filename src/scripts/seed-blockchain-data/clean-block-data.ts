import 'dotenv/config';

import addressEventsService from '../../services/address-events.service';
import cascadeService from '../../services/cascade.service';
import nftService from '../../services/nft.service';
import senserequestsService from '../../services/senserequests.service';
import ticketService from '../../services/ticket.service';
import transactionService from '../../services/transaction.service';
import { getDateErrorFormat } from '../../utils/helpers';
import { getBlock } from './get-blocks';
import { getAddressEvents, mapTransactionFromRPCToJSON } from './mappers';
import { BatchAddressEvents } from './update-database';

export async function cleanBlockData(blockHeight: number): Promise<boolean> {
  try {
    const { rawTransactions, vinTransactions } = await getBlock(blockHeight);
    const currentTransactions = await transactionService.getAllIdByBlockHeight(
      blockHeight,
    );
    const batchAddressEvents = rawTransactions.reduce<BatchAddressEvents>(
      (acc, transaction) => [
        ...acc,
        ...getAddressEvents(transaction, vinTransactions),
      ],
      [],
    );
    const batchTransactions = rawTransactions.map(t =>
      mapTransactionFromRPCToJSON(t, JSON.stringify(t), batchAddressEvents),
    );

    if (batchTransactions?.length) {
      const deleteTransactions = [];
      for (let i = 0; i < currentTransactions.length; i++) {
        const item = batchTransactions.find(
          b => b.id === currentTransactions[i].id,
        );
        if (!item) {
          deleteTransactions.push(currentTransactions[i].id);
        }
      }
      if (deleteTransactions.length) {
        await addressEventsService.deleteAllByTxIds(deleteTransactions);
        await transactionService.deleteAllTransactionByTxIds(
          deleteTransactions,
        );
        await senserequestsService.deleteAllByTxIds(deleteTransactions);
        await cascadeService.deleteAllByTxIds(deleteTransactions);
        await nftService.deleteAllByTxIds(deleteTransactions);
        await ticketService.deleteAllByTxIds(deleteTransactions);
      }
      for (let i = 0; i < currentTransactions.length; i++) {
        const addresses = batchAddressEvents
          .filter(e => e.transactionHash === currentTransactions[i].id)
          .map(e => e.address);
        if (addresses?.length) {
          await addressEventsService.deleteEventAndAddressNotInTransaction(
            currentTransactions[i].id,
            addresses,
          );
        }
      }
    }
    return true;
  } catch (error) {
    console.error(
      `Clean block data (height: ${blockHeight}) error >>> ${getDateErrorFormat()} >>>`,
      error.message,
    );

    return false;
  }
}
