import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('CascadeEntity')
export class CascadeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  transactionHash: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  blockHeight: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  @Index()
  public transactionTime: number;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  fileName: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  fileType: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  fileSize: number;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  dataHash: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  make_publicly_accessible: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  pastelId: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  rq_ic: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  rq_max: number;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  rq_oti: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  rq_ids: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  rawData: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  key: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  label: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  storage_fee: number;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  status: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public timestamp: number;
}

export type TRegisteredCascadeFiles = {
  numberOfRegistered: number;
  totalNumberOfRegistered: number;
  dataSize: number;
  dataSizeBytesCounter: number;
  averageFileSize: number;
  averageFileSizeInBytes: number;
  blockHeight: number;
  blockTime: number;
  rawData: number;
  timestamp: number;
};
