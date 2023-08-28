import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTicketEntity1693199912957 implements MigrationInterface {
  name = 'AlterTicketEntity1693199912957';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "temporary_TicketEntity" ("type" varchar NOT NULL, "height" integer NOT NULL, "rawData" varchar NOT NULL, "timestamp" integer NOT NULL, "transactionHash" varchar NOT NULL, "signature" varchar NOT NULL, "pastelID" varchar, "ticketId" varchar, "transactionTime" integer, "otherData" varchar, "detailId" varchar, "blockHeightRegistered" integer, "totalCost" integer)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_TicketEntity"("type", "height", "rawData", "timestamp", "transactionHash", "signature", "pastelID", "ticketId", "transactionTime", "otherData", "detailId", "blockHeightRegistered", "totalCost") SELECT "type", "height", "rawData", "timestamp", "transactionHash", "signature", "pastelID", "ticketId", "transactionTime", "otherData", "detailId", "blockHeightRegistered", "totalCost" FROM "TicketEntity"`,
    );
    await queryRunner.query(`DROP TABLE "TicketEntity"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_TicketEntity" RENAME TO "TicketEntity"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f5c1ba45a01082f6463e3927f4" ON "TicketEntity" ("totalCost") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_35228e1b2272a2872fd57d3ae6" ON "TicketEntity" ("blockHeightRegistered") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_06cee27c1ef2995cf867ea641c" ON "TicketEntity" ("pastelID") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78e3a0286c4a1bd9f1cb213205" ON "TicketEntity" ("signature") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7de42bf3d703228a379a82860a" ON "TicketEntity" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e863a62ecdf9a789db00434383" ON "TicketEntity" ("height") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_34fc98f7cb33c738a8ec9e582d" ON "TicketEntity" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_60c78c2bd8c3f0b63a6e101cc5" ON "TicketEntity" ("ticketId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_74d38ca37de95aaffbe913f3d8" ON "TicketEntity" ("transactionTime") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6fef357cfd3fad7730af07ad92" ON "TicketEntity" ("detailId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_TicketEntity" ("type" varchar NOT NULL, "height" integer NOT NULL, "rawData" varchar NOT NULL, "timestamp" integer NOT NULL, "transactionHash" varchar(64) PRIMARY KEY NOT NULL, "signature" varchar NOT NULL, "pastelID" varchar, "ticketId" varchar, "transactionTime" integer, "otherData" varchar, "detailId" varchar, "blockHeightRegistered" integer, "totalCost" integer)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_TicketEntity"("type", "height", "rawData", "timestamp", "transactionHash", "signature", "pastelID", "ticketId", "transactionTime", "otherData", "detailId", "blockHeightRegistered", "totalCost") SELECT "type", "height", "rawData", "timestamp", "transactionHash", "signature", "pastelID", "ticketId", "transactionTime", "otherData", "detailId", "blockHeightRegistered", "totalCost" FROM "TicketEntity"`,
    );
    await queryRunner.query(`DROP TABLE "TicketEntity"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_TicketEntity" RENAME TO "TicketEntity"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f5c1ba45a01082f6463e3927f4" ON "TicketEntity" ("totalCost") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_35228e1b2272a2872fd57d3ae6" ON "TicketEntity" ("blockHeightRegistered") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_06cee27c1ef2995cf867ea641c" ON "TicketEntity" ("pastelID") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78e3a0286c4a1bd9f1cb213205" ON "TicketEntity" ("signature") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7de42bf3d703228a379a82860a" ON "TicketEntity" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e863a62ecdf9a789db00434383" ON "TicketEntity" ("height") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_34fc98f7cb33c738a8ec9e582d" ON "TicketEntity" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_60c78c2bd8c3f0b63a6e101cc5" ON "TicketEntity" ("ticketId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_74d38ca37de95aaffbe913f3d8" ON "TicketEntity" ("transactionTime") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6fef357cfd3fad7730af07ad92" ON "TicketEntity" ("detailId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "TicketEntity" RENAME TO "temporary_TicketEntity"`,
    );
    await queryRunner.query(
      `CREATE TABLE "TicketEntity" ("type" varchar NOT NULL, "height" integer NOT NULL, "rawData" varchar NOT NULL, "timestamp" integer NOT NULL, "transactionHash" varchar NOT NULL, "signature" varchar NOT NULL, "pastelID" varchar, "ticketId" varchar, "transactionTime" integer, "otherData" varchar, "detailId" varchar, "blockHeightRegistered" integer, "totalCost" integer)`,
    );
    await queryRunner.query(
      `INSERT INTO "TicketEntity"("type", "height", "rawData", "timestamp", "transactionHash", "signature", "pastelID", "ticketId", "transactionTime", "otherData", "detailId", "blockHeightRegistered", "totalCost") SELECT "type", "height", "rawData", "timestamp", "transactionHash", "signature", "pastelID", "ticketId", "transactionTime", "otherData", "detailId", "blockHeightRegistered", "totalCost" FROM "temporary_TicketEntity"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_TicketEntity"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_6fef357cfd3fad7730af07ad92" ON "TicketEntity" ("detailId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_74d38ca37de95aaffbe913f3d8" ON "TicketEntity" ("transactionTime") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_60c78c2bd8c3f0b63a6e101cc5" ON "TicketEntity" ("ticketId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_34fc98f7cb33c738a8ec9e582d" ON "TicketEntity" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e863a62ecdf9a789db00434383" ON "TicketEntity" ("height") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7de42bf3d703228a379a82860a" ON "TicketEntity" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78e3a0286c4a1bd9f1cb213205" ON "TicketEntity" ("signature") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_06cee27c1ef2995cf867ea641c" ON "TicketEntity" ("pastelID") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_35228e1b2272a2872fd57d3ae6" ON "TicketEntity" ("blockHeightRegistered") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f5c1ba45a01082f6463e3927f4" ON "TicketEntity" ("totalCost") `,
    );
    await queryRunner.query(
      `ALTER TABLE "TicketEntity" RENAME TO "temporary_TicketEntity"`,
    );
    await queryRunner.query(
      `CREATE TABLE "TicketEntity" ("id" varchar PRIMARY KEY NOT NULL, "type" varchar NOT NULL, "height" integer NOT NULL, "rawData" varchar NOT NULL, "timestamp" integer NOT NULL, "transactionHash" varchar NOT NULL, "signature" varchar NOT NULL, "pastelID" varchar, "ticketId" varchar, "transactionTime" integer, "otherData" varchar, "detailId" varchar, "blockHeightRegistered" integer, "totalCost" integer)`,
    );
    await queryRunner.query(
      `INSERT INTO "TicketEntity"("type", "height", "rawData", "timestamp", "transactionHash", "signature", "pastelID", "ticketId", "transactionTime", "otherData", "detailId", "blockHeightRegistered", "totalCost") SELECT "type", "height", "rawData", "timestamp", "transactionHash", "signature", "pastelID", "ticketId", "transactionTime", "otherData", "detailId", "blockHeightRegistered", "totalCost" FROM "temporary_TicketEntity"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_TicketEntity"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_6fef357cfd3fad7730af07ad92" ON "TicketEntity" ("detailId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_74d38ca37de95aaffbe913f3d8" ON "TicketEntity" ("transactionTime") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_60c78c2bd8c3f0b63a6e101cc5" ON "TicketEntity" ("ticketId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_34fc98f7cb33c738a8ec9e582d" ON "TicketEntity" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e863a62ecdf9a789db00434383" ON "TicketEntity" ("height") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7de42bf3d703228a379a82860a" ON "TicketEntity" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78e3a0286c4a1bd9f1cb213205" ON "TicketEntity" ("signature") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_06cee27c1ef2995cf867ea641c" ON "TicketEntity" ("pastelID") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_35228e1b2272a2872fd57d3ae6" ON "TicketEntity" ("blockHeightRegistered") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f5c1ba45a01082f6463e3927f4" ON "TicketEntity" ("totalCost") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_26d9b319aeb4b1ddab717ca6d2" ON "TicketEntity" ("transactionHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6a235b1a5099e5a40b8c6ec6e1" ON "NftEntity" ("transactionHash") `,
    );
  }
}
