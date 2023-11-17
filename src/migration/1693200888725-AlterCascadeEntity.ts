import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterCascadeEntity1693200888725 implements MigrationInterface {
  name = 'AlterCascadeEntity1693200888725';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "temporary_CascadeEntity" ("transactionHash" varchar NOT NULL, "blockHeight" integer NOT NULL, "transactionTime" integer, "fileName" varchar NOT NULL, "fileType" varchar NOT NULL, "fileSize" integer NOT NULL, "dataHash" varchar NOT NULL, "make_publicly_accessible" varchar NOT NULL, "pastelId" varchar NOT NULL, "rq_ic" integer NOT NULL, "rq_max" integer NOT NULL, "rq_oti" varchar NOT NULL, "rq_ids" varchar NOT NULL, "rawData" varchar NOT NULL, "key" varchar NOT NULL, "label" varchar NOT NULL, "storage_fee" integer NOT NULL, "status" varchar NOT NULL, "timestamp" integer NOT NULL)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_CascadeEntity"("transactionHash", "blockHeight", "transactionTime", "fileName", "fileType", "fileSize", "dataHash", "make_publicly_accessible", "pastelId", "rq_ic", "rq_max", "rq_oti", "rq_ids", "rawData", "key", "label", "storage_fee", "status", "timestamp") SELECT "transactionHash", "blockHeight", "transactionTime", "fileName", "fileType", "fileSize", "dataHash", "make_publicly_accessible", "pastelId", "rq_ic", "rq_max", "rq_oti", "rq_ids", "rawData", "key", "label", "storage_fee", "status", "timestamp" FROM "CascadeEntity"`,
    );
    await queryRunner.query(`DROP TABLE "CascadeEntity"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_CascadeEntity" RENAME TO "CascadeEntity"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fb2d0f25e6cf4aa2706a465285" ON "CascadeEntity" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9c675ff6566714e645afdc32cb" ON "CascadeEntity" ("rq_ids") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_af50a1060aa7caee52e9b5b724" ON "CascadeEntity" ("rq_oti") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b7bb58f3f58835f66f3361914d" ON "CascadeEntity" ("rq_max") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_76b6df528c31fbf979e39a4004" ON "CascadeEntity" ("rq_ic") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a4ea2db81321577b2e1bd1de6d" ON "CascadeEntity" ("pastelId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6ca72619696779ee74b7527c0f" ON "CascadeEntity" ("make_publicly_accessible") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3fbbd61e365a537b0593b4b01c" ON "CascadeEntity" ("dataHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8b432287f64c4b69141673b400" ON "CascadeEntity" ("fileSize") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0eb28b2e421c86589a972ac190" ON "CascadeEntity" ("fileType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4155b960bdde591458078949fd" ON "CascadeEntity" ("fileName") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_91dec7dba7775aac9c0f30239c" ON "CascadeEntity" ("transactionTime") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e19ac375e5d2f8aa681a867fb4" ON "CascadeEntity" ("blockHeight") `,
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_CascadeEntity" ("transactionHash" varchar(64) PRIMARY KEY NOT NULL, "blockHeight" integer NOT NULL, "transactionTime" integer, "fileName" varchar NOT NULL, "fileType" varchar NOT NULL, "fileSize" integer NOT NULL, "dataHash" varchar NOT NULL, "make_publicly_accessible" varchar NOT NULL, "pastelId" varchar NOT NULL, "rq_ic" integer NOT NULL, "rq_max" integer NOT NULL, "rq_oti" varchar NOT NULL, "rq_ids" varchar NOT NULL, "rawData" varchar NOT NULL, "key" varchar NOT NULL, "label" varchar NOT NULL, "storage_fee" integer NOT NULL, "status" varchar NOT NULL, "timestamp" integer NOT NULL)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_CascadeEntity"("transactionHash", "blockHeight", "transactionTime", "fileName", "fileType", "fileSize", "dataHash", "make_publicly_accessible", "pastelId", "rq_ic", "rq_max", "rq_oti", "rq_ids", "rawData", "key", "label", "storage_fee", "status", "timestamp") SELECT "transactionHash", "blockHeight", "transactionTime", "fileName", "fileType", "fileSize", "dataHash", "make_publicly_accessible", "pastelId", "rq_ic", "rq_max", "rq_oti", "rq_ids", "rawData", "key", "label", "storage_fee", "status", "timestamp" FROM "CascadeEntity"`,
    );
    await queryRunner.query(`DROP TABLE "CascadeEntity"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_CascadeEntity" RENAME TO "CascadeEntity"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fb2d0f25e6cf4aa2706a465285" ON "CascadeEntity" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9c675ff6566714e645afdc32cb" ON "CascadeEntity" ("rq_ids") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_af50a1060aa7caee52e9b5b724" ON "CascadeEntity" ("rq_oti") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b7bb58f3f58835f66f3361914d" ON "CascadeEntity" ("rq_max") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_76b6df528c31fbf979e39a4004" ON "CascadeEntity" ("rq_ic") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a4ea2db81321577b2e1bd1de6d" ON "CascadeEntity" ("pastelId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6ca72619696779ee74b7527c0f" ON "CascadeEntity" ("make_publicly_accessible") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3fbbd61e365a537b0593b4b01c" ON "CascadeEntity" ("dataHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8b432287f64c4b69141673b400" ON "CascadeEntity" ("fileSize") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0eb28b2e421c86589a972ac190" ON "CascadeEntity" ("fileType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4155b960bdde591458078949fd" ON "CascadeEntity" ("fileName") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_91dec7dba7775aac9c0f30239c" ON "CascadeEntity" ("transactionTime") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e19ac375e5d2f8aa681a867fb4" ON "CascadeEntity" ("blockHeight") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "CascadeEntity" RENAME TO "temporary_CascadeEntity"`,
    );
    await queryRunner.query(
      `CREATE TABLE "CascadeEntity" ("transactionHash" varchar NOT NULL, "blockHeight" integer NOT NULL, "transactionTime" integer, "fileName" varchar NOT NULL, "fileType" varchar NOT NULL, "fileSize" integer NOT NULL, "dataHash" varchar NOT NULL, "make_publicly_accessible" varchar NOT NULL, "pastelId" varchar NOT NULL, "rq_ic" integer NOT NULL, "rq_max" integer NOT NULL, "rq_oti" varchar NOT NULL, "rq_ids" varchar NOT NULL, "rawData" varchar NOT NULL, "key" varchar NOT NULL, "label" varchar NOT NULL, "storage_fee" integer NOT NULL, "status" varchar NOT NULL, "timestamp" integer NOT NULL)`,
    );
    await queryRunner.query(
      `INSERT INTO "CascadeEntity"("transactionHash", "blockHeight", "transactionTime", "fileName", "fileType", "fileSize", "dataHash", "make_publicly_accessible", "pastelId", "rq_ic", "rq_max", "rq_oti", "rq_ids", "rawData", "key", "label", "storage_fee", "status", "timestamp") SELECT "transactionHash", "blockHeight", "transactionTime", "fileName", "fileType", "fileSize", "dataHash", "make_publicly_accessible", "pastelId", "rq_ic", "rq_max", "rq_oti", "rq_ids", "rawData", "key", "label", "storage_fee", "status", "timestamp" FROM "temporary_CascadeEntity"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_CascadeEntity"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_e19ac375e5d2f8aa681a867fb4" ON "CascadeEntity" ("blockHeight") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_91dec7dba7775aac9c0f30239c" ON "CascadeEntity" ("transactionTime") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4155b960bdde591458078949fd" ON "CascadeEntity" ("fileName") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0eb28b2e421c86589a972ac190" ON "CascadeEntity" ("fileType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8b432287f64c4b69141673b400" ON "CascadeEntity" ("fileSize") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3fbbd61e365a537b0593b4b01c" ON "CascadeEntity" ("dataHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6ca72619696779ee74b7527c0f" ON "CascadeEntity" ("make_publicly_accessible") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a4ea2db81321577b2e1bd1de6d" ON "CascadeEntity" ("pastelId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_76b6df528c31fbf979e39a4004" ON "CascadeEntity" ("rq_ic") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b7bb58f3f58835f66f3361914d" ON "CascadeEntity" ("rq_max") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_af50a1060aa7caee52e9b5b724" ON "CascadeEntity" ("rq_oti") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9c675ff6566714e645afdc32cb" ON "CascadeEntity" ("rq_ids") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fb2d0f25e6cf4aa2706a465285" ON "CascadeEntity" ("timestamp") `,
    );
    await queryRunner.query(
      `ALTER TABLE "CascadeEntity" RENAME TO "temporary_CascadeEntity"`,
    );
    await queryRunner.query(
      `CREATE TABLE "CascadeEntity" ("id" varchar PRIMARY KEY NOT NULL, "transactionHash" varchar NOT NULL, "blockHeight" integer NOT NULL, "transactionTime" integer, "fileName" varchar NOT NULL, "fileType" varchar NOT NULL, "fileSize" integer NOT NULL, "dataHash" varchar NOT NULL, "make_publicly_accessible" varchar NOT NULL, "pastelId" varchar NOT NULL, "rq_ic" integer NOT NULL, "rq_max" integer NOT NULL, "rq_oti" varchar NOT NULL, "rq_ids" varchar NOT NULL, "rawData" varchar NOT NULL, "key" varchar NOT NULL, "label" varchar NOT NULL, "storage_fee" integer NOT NULL, "status" varchar NOT NULL, "timestamp" integer NOT NULL)`,
    );
    await queryRunner.query(
      `INSERT INTO "CascadeEntity"("transactionHash", "blockHeight", "transactionTime", "fileName", "fileType", "fileSize", "dataHash", "make_publicly_accessible", "pastelId", "rq_ic", "rq_max", "rq_oti", "rq_ids", "rawData", "key", "label", "storage_fee", "status", "timestamp") SELECT "transactionHash", "blockHeight", "transactionTime", "fileName", "fileType", "fileSize", "dataHash", "make_publicly_accessible", "pastelId", "rq_ic", "rq_max", "rq_oti", "rq_ids", "rawData", "key", "label", "storage_fee", "status", "timestamp" FROM "temporary_CascadeEntity"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_CascadeEntity"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_e19ac375e5d2f8aa681a867fb4" ON "CascadeEntity" ("blockHeight") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_91dec7dba7775aac9c0f30239c" ON "CascadeEntity" ("transactionTime") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4155b960bdde591458078949fd" ON "CascadeEntity" ("fileName") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0eb28b2e421c86589a972ac190" ON "CascadeEntity" ("fileType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8b432287f64c4b69141673b400" ON "CascadeEntity" ("fileSize") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3fbbd61e365a537b0593b4b01c" ON "CascadeEntity" ("dataHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6ca72619696779ee74b7527c0f" ON "CascadeEntity" ("make_publicly_accessible") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a4ea2db81321577b2e1bd1de6d" ON "CascadeEntity" ("pastelId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_76b6df528c31fbf979e39a4004" ON "CascadeEntity" ("rq_ic") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b7bb58f3f58835f66f3361914d" ON "CascadeEntity" ("rq_max") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_af50a1060aa7caee52e9b5b724" ON "CascadeEntity" ("rq_oti") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9c675ff6566714e645afdc32cb" ON "CascadeEntity" ("rq_ids") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fb2d0f25e6cf4aa2706a465285" ON "CascadeEntity" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a0085be794f441f4dbf02ab53c" ON "CascadeEntity" ("transactionHash") `,
    );
  }
}
