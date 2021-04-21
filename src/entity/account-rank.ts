import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('AccountRank')
export class AccountRankEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public rank: number;

  @Column({
    type: 'float',
    nullable: false,
  })
  public percentage: number;

  @Column({
    type: 'float',
    nullable: true,
  })
  public amount: number;

  @Column({
    type: 'varchar',
    nullable: false,
    unique: false,
  })
  @Index()
  address: string;
}
