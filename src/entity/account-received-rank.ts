import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('AccountReceivedRank')
export class AccountReceivedRankEntity {
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
