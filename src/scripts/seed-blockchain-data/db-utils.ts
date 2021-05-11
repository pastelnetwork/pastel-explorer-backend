import { Connection } from 'typeorm';

import { AddressEventEntity } from '../../entity/address-event.entity';
import { BlockEntity } from '../../entity/block.entity';
import { TransactionEntity } from '../../entity/transaction.entity';

export async function batchCreateAddressEvents(
  connection: Connection,
  addressEventData: Omit<AddressEventEntity, 'id' | 'transaction'>[],
): Promise<void> {
  await connection
    .createQueryBuilder()
    .insert()
    .into(AddressEventEntity)
    .values(addressEventData)
    .execute();
}

export async function batchCreateBlocks(
  connection: Connection,
  blocks: BlockEntity[],
): Promise<void> {
  await connection
    .createQueryBuilder()
    .insert()
    .into(BlockEntity)
    .values(blocks)
    .execute();
}

export async function batchCreateUnconfirmedTransactions(
  connection: Connection,
  transactions: Omit<TransactionEntity, 'block'>[],
): Promise<void> {
  await connection.getRepository(TransactionEntity).save(transactions);
}

export async function batchCreateTransactions(
  connection: Connection,
  transactions: Omit<TransactionEntity, 'block'>[],
): Promise<void> {
  await connection.getRepository(TransactionEntity).save(transactions);
}

export async function getLastSavedBlock(
  connection: Connection,
): Promise<number> {
  const { height } = await connection
    .getRepository(BlockEntity)
    .createQueryBuilder('block')
    .select('MAX(block.timestamp), height')
    .getRawOne();
  return Number(height);
}
