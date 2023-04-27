import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('HistoricalMarketEntity')
export class HistoricalMarketEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  period1d: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  period7d: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  period14d: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  period30d: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  period90d: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  period180d: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  period1y: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  periodmax: string;

  @Index()
  @Column({
    type: 'int',
    nullable: false,
  })
  public createdAt: number;
}
