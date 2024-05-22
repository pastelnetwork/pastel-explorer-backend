import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('Masternode')
export class MasternodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({
    type: 'varchar',
    nullable: false,
    unique: false,
  })
  @Index()
  ip: string;

  @Column({
    type: 'varchar',
    nullable: false,
    unique: false,
  })
  @Index()
  port: string;

  @Column({
    type: 'varchar',
    nullable: false,
    unique: false,
  })
  country: string;

  @Column({
    type: 'varchar',
    nullable: false,
    unique: false,
  })
  city: string;

  @Column({
    type: 'float',
    nullable: false,
  })
  latitude: number;

  @Column({
    type: 'float',
    nullable: false,
  })
  longitude: number;

  @Column({
    type: 'varchar',
    nullable: false,
    unique: false,
  })
  status: string;

  @Column({
    type: 'varchar',
    nullable: false,
    unique: false,
  })
  address: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  masternodecreated: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  lastPaidTime: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  lastPaidBlock: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  protocolVersion: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  dateTimeLastSeen: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  activeSeconds: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  snPastelIdPubkey: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  pubkey: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  extAddress: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  extP2P: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  masternodeRank: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  rankAsOfBlockHeight: number;
}
