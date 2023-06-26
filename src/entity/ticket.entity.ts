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
    nullable: true,
  })
  otherData: string;

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
    type: 'varchar',
    nullable: true,
  })
  @Index()
  ticketId: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  @Index()
  public transactionTime: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  @Index()
  detailId: string;

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
  otherData: string;
  signature: string;
  pastelID?: string;
  ticketId?: string;
  transactionTime?: number;
  detailId?: string;
  timestamp: number;
};
