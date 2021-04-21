import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('Peer')
export class PeerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  public nodeId: number;

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
  protocol: string;

  @Column({
    type: 'float',
    nullable: false,
  })
  version: number;
}
