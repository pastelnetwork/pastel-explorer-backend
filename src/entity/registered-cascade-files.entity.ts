import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('RegisteredCascadeFilesEntity')
export class RegisteredCascadeFilesEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public numberOfRegistered: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public totalNumberOfRegistered: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public dataSize: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public dataSizeBytesCounter: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public averageFileSize: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public averageFileSizeInBytes: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public blockHeight: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  public blockTime: number;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  rawData: string;

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
