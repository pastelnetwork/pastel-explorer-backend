import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('PlsPrice')
export class PlsPriceEntity {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({
    type: 'float',
    nullable: false,
  })
  price_usd: number;
  
  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public timestamp: number;
}
