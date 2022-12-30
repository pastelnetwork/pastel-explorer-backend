import { MigrationInterface, QueryRunner } from 'typeorm';

export class SenseRequests1670994105995 implements MigrationInterface {
  name = 'SenseRequests1670994105995';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "SenseRequestsEntity" ("imageFileHash" varchar PRIMARY KEY NOT NULL, "imageFileCdnUrl" varchar, "imageTitle" varchar, "imageDescription" varchar, "isPublic" boolean, "transactionHash" varchar NOT NULL, "rawData" varchar NOT NULL, "isLikelyDupe" boolean, "dupeDetectionSystemVersion" varchar, "openNsfwScore" integer, "rarenessScore" integer, "ipfsLink" varchar, "sha256HashOfSenseResults" varchar, "blockHash" varchar NOT NULL, "blockHeight" integer NOT NULL, "utcTimestampWhenRequestSubmitted" varchar, "pastelIdOfSubmitter" varchar NOT NULL, "pastelIdOfRegisteringSupernode1" varchar, "pastelIdOfRegisteringSupernode2" varchar, "pastelIdOfRegisteringSupernode3" varchar, "isPastelOpenapiRequest" boolean, "openApiSubsetIdString" varchar, "isRareOnInternet" boolean, "pctOfTop10MostSimilarWithDupeProbAbove25pct" integer, "pctOfTop10MostSimilarWithDupeProbAbove33pct" integer, "pctOfTop10MostSimilarWithDupeProbAbove50pct" integer, "rarenessScoresTable" varchar, "internetRareness" varchar, "alternativeNsfwScores" varchar, "imageFingerprintOfCandidateImageFile" varchar, "createdDate" integer NOT NULL, "lastUpdated" integer NOT NULL, "requestType" varchar NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1de020b7329b538c4728925a66" ON "SenseRequestsEntity" ("imageFileHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f6d974629e230e6e1efbde70a6" ON "SenseRequestsEntity" ("imageTitle") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7c90e455a4c4dd27d1f0a0be3c" ON "SenseRequestsEntity" ("isPublic") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9e52a343248b6dfbae8f1e9c91" ON "SenseRequestsEntity" ("transactionHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3b0dd40727d2c0a9833d82c5a7" ON "SenseRequestsEntity" ("rawData") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b13f8b171d5ec3c541fc12c77e" ON "SenseRequestsEntity" ("isLikelyDupe") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3b5d8b264efcb561e5a6c6cbdd" ON "SenseRequestsEntity" ("dupeDetectionSystemVersion") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_13937385dc9695b68802b19bf9" ON "SenseRequestsEntity" ("openNsfwScore") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_62ff076b11b4458f2319592832" ON "SenseRequestsEntity" ("rarenessScore") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d20377b3f8c41e4fdb1946e668" ON "SenseRequestsEntity" ("blockHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a27bbb63f78526eb0efc4453f2" ON "SenseRequestsEntity" ("blockHeight") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3e2ba1a16c698831d0543434df" ON "SenseRequestsEntity" ("utcTimestampWhenRequestSubmitted") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_77fa1ff5904b59c0dfd7552e47" ON "SenseRequestsEntity" ("pastelIdOfSubmitter") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bfa05f2d6cd5cba760cc5a6538" ON "SenseRequestsEntity" ("createdDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6ad4ac2045c1d477a57ca8f3e6" ON "SenseRequestsEntity" ("lastUpdated") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a2820088f6567aaf100c4b1c3f" ON "SenseRequestsEntity" ("requestType") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_a2820088f6567aaf100c4b1c3f"`);
    await queryRunner.query(`DROP INDEX "IDX_6ad4ac2045c1d477a57ca8f3e6"`);
    await queryRunner.query(`DROP INDEX "IDX_bfa05f2d6cd5cba760cc5a6538"`);
    await queryRunner.query(`DROP INDEX "IDX_77fa1ff5904b59c0dfd7552e47"`);
    await queryRunner.query(`DROP INDEX "IDX_3e2ba1a16c698831d0543434df"`);
    await queryRunner.query(`DROP INDEX "IDX_a27bbb63f78526eb0efc4453f2"`);
    await queryRunner.query(`DROP INDEX "IDX_d20377b3f8c41e4fdb1946e668"`);
    await queryRunner.query(`DROP INDEX "IDX_62ff076b11b4458f2319592832"`);
    await queryRunner.query(`DROP INDEX "IDX_13937385dc9695b68802b19bf9"`);
    await queryRunner.query(`DROP INDEX "IDX_3b5d8b264efcb561e5a6c6cbdd"`);
    await queryRunner.query(`DROP INDEX "IDX_b13f8b171d5ec3c541fc12c77e"`);
    await queryRunner.query(`DROP INDEX "IDX_3b0dd40727d2c0a9833d82c5a7"`);
    await queryRunner.query(`DROP INDEX "IDX_9e52a343248b6dfbae8f1e9c91"`);
    await queryRunner.query(`DROP INDEX "IDX_7c90e455a4c4dd27d1f0a0be3c"`);
    await queryRunner.query(`DROP INDEX "IDX_f6d974629e230e6e1efbde70a6"`);
    await queryRunner.query(`DROP INDEX "IDX_1de020b7329b538c4728925a66"`);
    await queryRunner.query(`DROP TABLE "SenseRequestsEntity"`);
  }
}
