import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('NettotalsEntity')
export class NettotalsEntity {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  totalbytesrecv: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  totalbytessent: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  timemillis: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public timestamp: number;
}

export type TNetTotals = {
  totalbytesrecv: number;
  totalbytessent: number;
  timemillis: number;
  timestamp?: number;
};
