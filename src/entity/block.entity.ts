import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('Block')
export class BlockEntity {
  @PrimaryColumn('varchar', {
    length: 64,
    unique: true,
  })
  id: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public timestamp: number;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  public height: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  public confirmations: number;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  public difficulty: string;

  @Column({
    type: 'varchar',
    nullable: false,
    unique: false,
  })
  @Index()
  merkleRoot: string;

  @Column({
    type: 'varchar',
    nullable: true,
    unique: false,
  })
  @Index()
  nextBlockHash: string;

  @Column({
    type: 'varchar',
    nullable: false,
    unique: false,
  })
  previousBlockHash: string;

  @Column({
    type: 'varchar',
    nullable: false,
    unique: false,
  })
  nonce: string;

  @Column({
    type: 'varchar',
    nullable: false,
    unique: false,
  })
  solution: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public size: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public transactionCount: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  totalTickets: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  ticketsList: string;
}
