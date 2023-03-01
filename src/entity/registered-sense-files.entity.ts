import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('RegisteredSenseFilesEntity')
export class RegisteredSenseFilesEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public numberOfRegisteredSenseFingerprints: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public totalNumberOfRegisteredSenseFingerprints: number;

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

export type TRegisteredSenseFiles = {
  numberOfRegisteredSenseFingerprints: number;
  totalNumberOfRegisteredSenseFingerprints: number;
  blockHeight: number;
  blockTime: number;
  rawData: number;
  timestamp: number;
};
