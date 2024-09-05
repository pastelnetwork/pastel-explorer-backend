import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('TicketEntity')
export class TicketEntity {
  @PrimaryColumn('varchar', {
    length: 64,
  })
  transactionHash: string;

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
    type: 'int',
    nullable: true,
  })
  @Index()
  public blockHeightRegistered: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  @Index()
  public totalCost: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  @Index()
  detailId: string;

  @Column({
    type: 'varchar',
    nullable: true,
    length: 10,
    default: 'checked',
  })
  @Index()
  status: string;

  @Column({
    type: 'varchar',
    nullable: true,
    default: null,
  })
  @Index()
  sub_type: string;

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
  status?: string;
  timestamp: number;
};
