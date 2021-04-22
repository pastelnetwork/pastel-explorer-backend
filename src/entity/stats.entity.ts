import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('StatsEntity')
export class StatsEntity {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({
    type: 'float',
    nullable: false,
  })
  difficulty: number;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  gigaHashPerSec: string;

  @Column({
    type: 'float',
    nullable: false,
  })
  coinSupply: number;

  @Column({
    type: 'float',
    nullable: false,
  })
  btcPrice: number;

  @Column({
    type: 'float',
    nullable: false,
  })
  usdPrice: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  marketCapInUSD: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  transactions: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public timestamp: number;
}
