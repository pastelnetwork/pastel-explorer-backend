import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('MempoolInfoEntity')
export class MempoolInfoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  size: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  bytes: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  usage: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public timestamp: number;
}

export type TMempoolInfo = {
  size: number;
  bytes: number;
  usage: number;
  timestamp?: number;
};
