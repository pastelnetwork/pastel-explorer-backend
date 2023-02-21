import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('SenseRequestsEntity')
export class SenseRequestsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  imageFileHash: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  imageFileCdnUrl: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  @Index()
  imageTitle: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  imageDescription: string;

  @Column({
    type: 'boolean',
    nullable: true,
  })
  @Index()
  isPublic: boolean;

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
  @Index()
  rawData: string;

  @Column({
    type: 'boolean',
    nullable: true,
  })
  @Index()
  isLikelyDupe: boolean;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  @Index()
  dupeDetectionSystemVersion: string;

  @Column({
    type: 'int',
    nullable: true,
  })
  @Index()
  openNsfwScore: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  @Index()
  rarenessScore: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  ipfsLink: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  sha256HashOfSenseResults: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  blockHash: string;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  blockHeight: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  @Index()
  currentBlockHeight: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  @Index()
  utcTimestampWhenRequestSubmitted: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  pastelIdOfSubmitter: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  pastelIdOfRegisteringSupernode1: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  pastelIdOfRegisteringSupernode2: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  pastelIdOfRegisteringSupernode3: string;

  @Column({
    type: 'boolean',
    nullable: true,
  })
  isPastelOpenapiRequest: boolean;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  openApiSubsetIdString: string;

  @Column({
    type: 'boolean',
    nullable: true,
  })
  isRareOnInternet: boolean;

  @Column({
    type: 'int',
    nullable: true,
  })
  pctOfTop10MostSimilarWithDupeProbAbove25pct: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  pctOfTop10MostSimilarWithDupeProbAbove33pct: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  pctOfTop10MostSimilarWithDupeProbAbove50pct: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  rarenessScoresTable: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  internetRareness: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  alternativeNsfwScores: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  imageFingerprintOfCandidateImageFile: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  parsedSenseResults: string;

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
  createdDate: number;

  @Column({
    type: 'int',
    nullable: false,
  })
  @Index()
  lastUpdated: number;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  @Index()
  requestType: string;
}

export type TSenseRequests = {
  imageFileHash: string;
  imageFileCdnUrl: string;
  imageTitle: string;
  imageDescription: string;
  isPublic: boolean;
  transactionHash: string;
  rawData: string;
  isLikelyDupe: boolean;
  dupeDetectionSystemVersion: string;
  openNsfwScore: number;
  rarenessScore: number;
  ipfsLink: string;
  sha256HashOfSenseResults: string;
  blockHash: string;
  blockHeight: number;
  currentBlockHeight?: number;
  utcTimestampWhenRequestSubmitted: string;
  pastelIdOfSubmitter: string;
  pastelIdOfRegisteringSupernode1: string;
  pastelIdOfRegisteringSupernode2: string;
  pastelIdOfRegisteringSupernode3: string;
  isPastelOpenapiRequest: boolean;
  openApiSubsetIdString: string;
  isRareOnInternet: boolean;
  pctOfTop10MostSimilarWithDupeProbAbove25pct: number;
  pctOfTop10MostSimilarWithDupeProbAbove33pct: number;
  pctOfTop10MostSimilarWithDupeProbAbove50pct: number;
  rarenessScoresTable: string;
  internetRareness: string;
  alternativeNsfwScores: string;
  imageFingerprintOfCandidateImageFile: string;
  parsedSenseResults?: string;
  transactionTime?: number;
  createdDate: number;
  lastUpdated: number;
  requestType: string;
};
