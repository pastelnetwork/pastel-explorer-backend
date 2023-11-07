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
  rawData: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  @Index()
  version: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  @Index()
  preview_thumbnail: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  pastel_block_hash_when_request_submitted: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  pastel_block_height_when_request_submitted: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  utc_timestamp_when_request_submitted: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  pastel_id_of_submitter: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  pastel_id_of_registering_supernode_1: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  pastel_id_of_registering_supernode_2: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  pastel_id_of_registering_supernode_3: string;

  @Column({
    type: 'boolean',
    nullable: true,
  })
  is_pastel_openapi_request: boolean;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  dupe_detection_system_version: string;

  @Column({
    type: 'boolean',
    nullable: true,
  })
  is_likely_dupe: boolean;

  @Column({
    type: 'boolean',
    nullable: true,
  })
  is_rare_on_internet: boolean;

  @Column({
    type: 'int',
    nullable: true,
  })
  overall_rareness_score: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  pct_of_top_10_most_similar_with_dupe_prob_above_25pct: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  pct_of_top_10_most_similar_with_dupe_prob_above_33pct: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  pct_of_top_10_most_similar_with_dupe_prob_above_50pct: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  rareness_scores_table_json_compressed_b64: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  open_nsfw_score: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  image_fingerprint_of_candidate_image_file: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  hash_of_candidate_image_file: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  collection_name_string: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  open_api_group_id_string: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  group_rareness_score: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  candidate_image_thumbnail_webp_as_base64_string: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  does_not_impact_the_following_collection_strings: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  is_invalid_sense_request: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  invalid_sense_request_reason: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  similarity_score_to_first_entry_in_collection: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  cp_probability: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  nsfw_score: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  child_probability: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  image_file_path: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  internet_rareness: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  alternative_nsfw_scores: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  max_permitted_open_nsfw_score: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  description: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  createdDate: number;
}
