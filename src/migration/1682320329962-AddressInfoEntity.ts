import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddressInfoEntity1682320329962 implements MigrationInterface {
  name = 'AddressInfoEntity1682320329962';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "AddressInfoEntity" ("address" varchar(35) PRIMARY KEY NOT NULL, "totalSent" integer NOT NULL, "totalReceived" integer NOT NULL, "balanceHistoryData" varchar NOT NULL, "receivedByMonthData" varchar NOT NULL, "sentByMonthData" varchar NOT NULL, "lastUpdated" integer NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6a755e111854c69e0a4823a1dd" ON "AddressInfoEntity" ("totalSent") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a5a425ee62f1cf50d9bd15a6f7" ON "AddressInfoEntity" ("totalReceived") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9b066485d110aee76ae59c64e0" ON "AddressInfoEntity" ("lastUpdated") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_9b066485d110aee76ae59c64e0"`);
    await queryRunner.query(`DROP INDEX "IDX_a5a425ee62f1cf50d9bd15a6f7"`);
    await queryRunner.query(`DROP INDEX "IDX_6a755e111854c69e0a4823a1dd"`);
    await queryRunner.query(`DROP TABLE "AddressInfoEntity"`);
  }
}
