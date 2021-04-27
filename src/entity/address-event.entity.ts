import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TransactionEntity } from './transaction.entity';

@Entity('AddressEvent')
export class AddressEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public timestamp: number;

  @Column({
    type: 'float',
    nullable: true,
  })
  @Index()
  public amount: number;

  @Column({
    type: 'varchar',
    nullable: false,
    unique: false,
  })
  @Index()
  transactionHash: string;

  @ManyToOne(() => TransactionEntity, {
    nullable: false,
  })
  @JoinColumn({ name: 'transactionHash' })
  public transaction: TransactionEntity;

  @Column({
    type: 'varchar',
    nullable: false,
    length: 35,
  })
  @Index()
  address: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  direction: TransferDirectionEnum;
}
