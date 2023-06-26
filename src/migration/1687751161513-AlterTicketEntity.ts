import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTicketEntity1687751161513 implements MigrationInterface {
  name = 'AlterTicketEntity1687751161513';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "temporary_TicketEntity" ("id" varchar PRIMARY KEY NOT NULL, "type" varchar NOT NULL, "height" integer NOT NULL, "rawData" varchar NOT NULL, "timestamp" integer NOT NULL, "transactionHash" varchar(64) NOT NULL, "signature" varchar NOT NULL, "pastelID" varchar, "ticketId" varchar, "transactionTime" integer, "otherData" varchar, "detailId" varchar)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_TicketEntity"("id", "type", "height", "rawData", "timestamp", "transactionHash", "signature", "pastelID", "ticketId", "transactionTime", "otherData") SELECT "id", "type", "height", "rawData", "timestamp", "transactionHash", "signature", "pastelID", "ticketId", "transactionTime", "otherData" FROM "TicketEntity"`,
    );
    await queryRunner.query(`DROP TABLE "TicketEntity"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_TicketEntity" RENAME TO "TicketEntity"`,
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
      `CREATE INDEX "IDX_26d9b319aeb4b1ddab717ca6d2" ON "TicketEntity" ("transactionHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_34fc98f7cb33c738a8ec9e582d" ON "TicketEntity" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_TicketEntity" ("id" varchar PRIMARY KEY NOT NULL, "type" varchar NOT NULL, "height" integer NOT NULL, "rawData" varchar NOT NULL, "timestamp" integer NOT NULL, "transactionHash" varchar NOT NULL, "signature" varchar NOT NULL, "pastelID" varchar, "ticketId" varchar, "transactionTime" integer, "otherData" varchar, "detailId" varchar)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_TicketEntity"("id", "type", "height", "rawData", "timestamp", "transactionHash", "signature", "pastelID", "ticketId", "transactionTime", "otherData", "detailId") SELECT "id", "type", "height", "rawData", "timestamp", "transactionHash", "signature", "pastelID", "ticketId", "transactionTime", "otherData", "detailId" FROM "TicketEntity"`,
    );
    await queryRunner.query(`DROP TABLE "TicketEntity"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_TicketEntity" RENAME TO "TicketEntity"`,
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
      `CREATE INDEX "IDX_26d9b319aeb4b1ddab717ca6d2" ON "TicketEntity" ("transactionHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_34fc98f7cb33c738a8ec9e582d" ON "TicketEntity" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0aa93c2cc9d58a1a1e022a2403" ON "StatsEntity" ("totalBurnedPSL") `,
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
      `CREATE TABLE "TicketEntity" ("id" varchar PRIMARY KEY NOT NULL, "type" varchar NOT NULL, "height" integer NOT NULL, "rawData" varchar NOT NULL, "timestamp" integer NOT NULL, "transactionHash" varchar(64) NOT NULL, "signature" varchar NOT NULL, "pastelID" varchar, "ticketId" varchar, "transactionTime" integer, "otherData" varchar, "detailId" varchar)`,
    );
    await queryRunner.query(
      `INSERT INTO "TicketEntity"("id", "type", "height", "rawData", "timestamp", "transactionHash", "signature", "pastelID", "ticketId", "transactionTime", "otherData", "detailId") SELECT "id", "type", "height", "rawData", "timestamp", "transactionHash", "signature", "pastelID", "ticketId", "transactionTime", "otherData", "detailId" FROM "temporary_TicketEntity"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_TicketEntity"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_34fc98f7cb33c738a8ec9e582d" ON "TicketEntity" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_26d9b319aeb4b1ddab717ca6d2" ON "TicketEntity" ("transactionHash") `,
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
      `ALTER TABLE "TicketEntity" RENAME TO "temporary_TicketEntity"`,
    );
    await queryRunner.query(
      `CREATE TABLE "TicketEntity" ("id" varchar PRIMARY KEY NOT NULL, "type" varchar NOT NULL, "height" integer NOT NULL, "rawData" varchar NOT NULL, "timestamp" integer NOT NULL, "transactionHash" varchar(64) NOT NULL, "signature" varchar NOT NULL, "pastelID" varchar, "ticketId" varchar, "transactionTime" integer, "otherData" varchar)`,
    );
    await queryRunner.query(
      `INSERT INTO "TicketEntity"("id", "type", "height", "rawData", "timestamp", "transactionHash", "signature", "pastelID", "ticketId", "transactionTime", "otherData") SELECT "id", "type", "height", "rawData", "timestamp", "transactionHash", "signature", "pastelID", "ticketId", "transactionTime", "otherData" FROM "temporary_TicketEntity"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_TicketEntity"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_34fc98f7cb33c738a8ec9e582d" ON "TicketEntity" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_26d9b319aeb4b1ddab717ca6d2" ON "TicketEntity" ("transactionHash") `,
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
  }
}
