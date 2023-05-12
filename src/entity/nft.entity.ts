import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('NftEntity')
export class NftEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  transactionHash: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  @Index()
  public transactionTime: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  blockHeight: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  key: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  label: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  total_copies: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  royalty: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  royalty_address: string;

  @Column({
    type: 'boolean',
    nullable: true,
  })
  green: boolean;

  @Column({
    type: 'int',
    nullable: true,
  })
  storage_fee: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  @Index()
  author: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  @Index()
  collection_txid: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  @Index()
  collection_name: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  @Index()
  collection_alias: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  creator_name: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  creator_website: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  creator_written_statement: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  nft_title: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  nft_type: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  nft_series_name: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  nft_creation_video_youtube_url: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  nft_keyword_set: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  preview_hash: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  thumbnail1_hash: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  thumbnail2_hash: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  data_hash: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  original_file_size_in_bytes: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  file_type: string;

  @Column({
    type: 'boolean',
    nullable: true,
  })
  make_publicly_accessible: boolean;

  @Column({
    type: 'int',
    nullable: true,
  })
  dd_and_fingerprints_ic: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  dd_and_fingerprints_max: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  dd_and_fingerprints_ids: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  rq_ic: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  rq_max: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  rq_ids: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  rq_oti: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  image: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  status: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  activation_ticket: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  @Index()
  ticketId: string;

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
}
