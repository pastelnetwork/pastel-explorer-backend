import { MigrationInterface, QueryRunner } from 'typeorm';

export class NftEntity1683866220674 implements MigrationInterface {
  name = 'NftEntity1683866220674';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "NftEntity" ("id" varchar PRIMARY KEY NOT NULL, "transactionHash" varchar NOT NULL, "transactionTime" integer, "blockHeight" integer NOT NULL, "key" varchar, "label" varchar, "total_copies" integer, "royalty" integer, "royalty_address" varchar, "green" boolean, "storage_fee" integer, "author" varchar, "collection_txid" varchar, "collection_name" varchar, "collection_alias" varchar, "creator_name" varchar, "creator_website" varchar, "creator_written_statement" varchar, "nft_title" varchar, "nft_type" varchar, "nft_series_name" varchar, "nft_creation_video_youtube_url" varchar, "nft_keyword_set" varchar, "preview_hash" varchar, "thumbnail1_hash" varchar, "thumbnail2_hash" varchar, "data_hash" varchar, "original_file_size_in_bytes" integer, "file_type" varchar, "make_publicly_accessible" boolean, "dd_and_fingerprints_ic" integer, "dd_and_fingerprints_max" integer, "dd_and_fingerprints_ids" varchar, "rq_ic" integer, "rq_max" integer, "rq_ids" varchar, "rq_oti" varchar, "image" varchar, "status" varchar, "activation_ticket" varchar, "ticketId" varchar, "rawData" varchar NOT NULL, "createdDate" integer NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6a235b1a5099e5a40b8c6ec6e1" ON "NftEntity" ("transactionHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2d52605676b9ead33449df8c25" ON "NftEntity" ("transactionTime") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dd6438e69e7a90ee241b3d58ef" ON "NftEntity" ("blockHeight") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8acf55a80e79f4b1784da5f1a9" ON "NftEntity" ("author") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b55d7eef628b7f23c8d29896c5" ON "NftEntity" ("collection_txid") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4169fbd3cb93fd04dfaa0aa34d" ON "NftEntity" ("collection_name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78b033f14126ecf93afc3c994b" ON "NftEntity" ("collection_alias") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_659d24fe1d8170e3f9d76564a2" ON "NftEntity" ("ticketId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2789c319e9a2ba1c09734540c2" ON "NftEntity" ("rawData") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_81376f4c43bea45af5d5acaee0" ON "NftEntity" ("createdDate") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_81376f4c43bea45af5d5acaee0"`);
    await queryRunner.query(`DROP INDEX "IDX_2789c319e9a2ba1c09734540c2"`);
    await queryRunner.query(`DROP INDEX "IDX_659d24fe1d8170e3f9d76564a2"`);
    await queryRunner.query(`DROP INDEX "IDX_78b033f14126ecf93afc3c994b"`);
    await queryRunner.query(`DROP INDEX "IDX_4169fbd3cb93fd04dfaa0aa34d"`);
    await queryRunner.query(`DROP INDEX "IDX_b55d7eef628b7f23c8d29896c5"`);
    await queryRunner.query(`DROP INDEX "IDX_8acf55a80e79f4b1784da5f1a9"`);
    await queryRunner.query(`DROP INDEX "IDX_dd6438e69e7a90ee241b3d58ef"`);
    await queryRunner.query(`DROP INDEX "IDX_2d52605676b9ead33449df8c25"`);
    await queryRunner.query(`DROP INDEX "IDX_6a235b1a5099e5a40b8c6ec6e1"`);
    await queryRunner.query(`DROP TABLE "NftEntity"`);
  }
}
