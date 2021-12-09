import { AddressEventEntity } from '../../entity/address-event.entity';
import { BlockEntity } from '../../entity/block.entity';
import { TransactionEntity } from '../../entity/transaction.entity';

type BatchAddressEvents = Array<Omit<AddressEventEntity, 'id' | 'transaction'>>;

export const mapBlockFromRPCToJSON = ({
  confirmations,
  difficulty,
  hash: id,
  height,
  merkleroot: merkleRoot,
  nextblockhash: nextBlockHash,
  previousblockhash: previousBlockHash,
  nonce,
  solution,
  size,
  time: timestamp,
  transactions,
}: BlockData): BlockEntity => ({
  confirmations,
  difficulty,
  id,
  height,
  merkleRoot,
  nextBlockHash,
  previousBlockHash,
  nonce,
  solution,
  size,
  timestamp,
  transactionCount: transactions.length,
});
export const mapTransactionFromRPCToJSON = (
  {
    vin,
    blockhash: blockHash,
    time: timestamp,
    txid: id,
    vout,
    size,
    fee,
    height,
  }: TransactionData,
  rawData: string,
  addressEvents: BatchAddressEvents,
): Omit<TransactionEntity, 'block'> => ({
  size,
  fee,
  height,
  blockHash,
  coinbase: (vin.length === 1 && Boolean(vin[0].coinbase) ? 1 : 0) || null,
  id,
  rawData: rawData,
  timestamp,
  recipientCount: vout.length,
  isNonStandard: vout.length === 0 ? 1 : null,
  totalAmount: addressEvents
    .filter(v => v.transactionHash === id && v.amount > 0)
    .reduce((acc, curr) => acc + Number(curr.amount), 0),
  unconfirmedTransactionDetails: blockHash
    ? null
    : JSON.stringify({
        addressEvents: addressEvents.filter(v => v.transactionHash === id),
      }),
});

export function getAddressEvents(
  transaction: TransactionData,
  vinTransactions: TransactionData[],
): BatchAddressEvents {
  const incomingTrxs = transaction.vin
    .map(t => {
      if (t.coinbase) {
        return null;
      }
      const relatedTransaction = vinTransactions.find(vt => vt.txid === t.txid);
      if (relatedTransaction) {
        const relatedTransfer = relatedTransaction.vout.find(
          v => v.n === t.vout,
        );
        return {
          address: relatedTransfer.scriptPubKey.addresses[0],
          amount: -1 * Number(relatedTransfer.value),
          timestamp: transaction.time,
          transactionHash: transaction.txid,
          direction: 'Outgoing' as TransferDirectionEnum,
        };
      }
    })
    .filter(Boolean);
  const outgoingTrxs = transaction.vout
    .map(t => ({
      address: t.scriptPubKey.addresses?.[0],
      amount: Number(t.value),
      timestamp: transaction.time,
      transactionHash: transaction.txid,
      direction: 'Incoming' as TransferDirectionEnum,
    }))
    .filter(v => Boolean(v.address));
  return [...incomingTrxs, ...outgoingTrxs];
}
