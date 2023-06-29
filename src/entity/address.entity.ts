import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('AddressEntity')
export class AddressEntity {
  @Column({
    type: 'varchar',
    nullable: false,
  })
  @PrimaryColumn()
  address: string;

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
  totalSent: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  totalReceived: number;

  @Column({
    type: 'int',
    nullable: false,
    default: Date.now(),
  })
  @Index()
  public createdAt: number;

  @Column({
    type: 'int',
    nullable: true,
    default: Date.now(),
  })
  @Index()
  public updatedAt: number;
}
