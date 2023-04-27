import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('AddressInfoEntity')
export class AddressInfoEntity {
  @PrimaryColumn('varchar', {
    length: 35,
  })
  address: string;

  @Index()
  @Column({
    type: 'int',
    nullable: false,
  })
  public totalSent: number;

  @Index()
  @Column({
    type: 'int',
    nullable: false,
  })
  public totalReceived: number;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  public balanceHistoryData: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  public receivedByMonthData: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  public sentByMonthData: string;

  @Index()
  @Column({
    type: 'int',
    nullable: false,
  })
  public lastUpdated: number;
}
