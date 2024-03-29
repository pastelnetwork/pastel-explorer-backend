import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { BlockEntity } from './block.entity';

@Entity('Transaction')
export class TransactionEntity {
  @PrimaryColumn('varchar', {
    length: 64,
  })
  id: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public timestamp: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  public isNonStandard: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  public coinbase: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public totalAmount: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public recipientCount: number;

  @Column({
    type: 'varchar',
    nullable: true,
    unique: false,
  })
  @Index()
  blockHash: string | null;

  @ManyToOne(() => BlockEntity, {
    nullable: false,
  })
  @JoinColumn({ name: 'blockHash' })
  public block: BlockEntity;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  unconfirmedTransactionDetails?: string | null;

  @Column({
    type: 'int',
    nullable: true,
  })
  size: number;

  @Column({
    type: 'float',
    nullable: true,
  })
  fee: number;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  rawData: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  @Index()
  height: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  tickets: string;

  @Column({
    type: 'int',
    nullable: true,
    default: 0,
  })
  ticketsTotal: number;
}
