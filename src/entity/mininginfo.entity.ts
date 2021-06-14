import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('MiningInfoEntity')
export class MiningInfoEntity {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  blocks: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  currentblocksize: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  currentblocktx: number;

  @Column({
    type: 'float',
    nullable: false,
  })
  difficulty: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  errors: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  genproclimit: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  localsolps: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  networksolps: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  networkhashps: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  pooledtx: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  testnet: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  chain: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  generate: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  public timestamp: number;
}

export type TMiningInfo = {
  blocks: number;
  currentblocksize: number;
  currentblocktx: number;
  difficulty: number;
  errors: string;
  genproclimit: number;
  localsolps: number;
  networksolps: number;
  networkhashps: number;
  pooledtx: number;
  testnet: number;
  chain: string;
  generate: boolean;
};
