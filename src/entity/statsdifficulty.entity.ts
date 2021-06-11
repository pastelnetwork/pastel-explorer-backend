import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('StatsDifficultyEntity')
export class StatsDifficultyEntity {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({
    type: 'float',
    nullable: false,
  })
  difficulty: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  solutions: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public timestamp: number;
}
