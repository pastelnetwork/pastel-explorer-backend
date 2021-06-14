import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('RawMemPoolInfoEntity')
export class RawMemPoolInfoEntity {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  transactionid: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  size: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  fee: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  time: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  height: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  startingpriority: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  currentpriority: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  depends: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public timestamp: number;
}

export type TRawMempoolInfo = {
  [index: string]: {
    transactionid: string;
    size: number;
    fee: number;
    time: number;
    height: number;
    startingpriority: number;
    currentpriority: number;
    depends: TRawMempoolInfo[];
  };
};

export type TRawMempool = {
  transactionid: string;
  size: number;
  fee: number;
  time: number;
  height: number;
  startingpriority: number;
  currentpriority: number;
  depends: TRawMempoolInfo[];
};
