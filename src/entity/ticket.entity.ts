import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('TicketEntity')
export class TicketEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  type: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public height: number;

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
  rawData: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  signature: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  @Index()
  pastelID: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public timestamp: number;
}

export type TTicket = {
  type: string;
  height: number;
  transactionHash: string;
  rawData: string;
  signature: string;
  pastelID?: string;
  timestamp: number;
};