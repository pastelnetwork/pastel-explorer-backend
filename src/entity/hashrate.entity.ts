import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('HashrateEntity')
export class HashrateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public networksolps5: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public networksolps10: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public networksolps25: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public networksolps50: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public networksolps100: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public networksolps500: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public networksolps1000: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public timestamp: number;
}

export type THashrate = {
  networksolps5: number;
  networksolps10: number;
  networksolps25: number;
  networksolps50: number;
  networksolps100: number;
  networksolps500: number;
  networksolps1000: number;
  timestamp?: number;
};
