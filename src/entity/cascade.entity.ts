import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('CascadeEntity')
export class CascadeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  @Index()
  cascadeId: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  transactionHash: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  rawData: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  createdDate: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  lastUpdated: number;
}

export type TCascadeRequests = {
  id: string;
  cascadeId: string;
  transactionHash: string;
  rawData: string;
  createdDate: number;
  lastUpdated: number;
};
