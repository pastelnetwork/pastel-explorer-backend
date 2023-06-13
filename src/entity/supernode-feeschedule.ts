import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('SupernodeFeeScheduleEntity')
export class SupernodeFeeScheduleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public blockHeight: number;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  public blockHash: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public blockTime: number;

  @Column({
    type: 'float',
    nullable: false,
  })
  @Index()
  public feeDeflatorFactor: number;

  @Column({
    type: 'float',
    nullable: true,
  })
  @Index()
  public pastelIdRegistrationFee: number;

  @Column({
    type: 'float',
    nullable: true,
  })
  @Index()
  public usernameRegistrationFee: number;

  @Column({
    type: 'float',
    nullable: true,
  })
  @Index()
  public usernameChangeFee: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  createdDate: number;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  rawData: string;
}
