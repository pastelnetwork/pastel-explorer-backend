import { MigrationInterface, QueryRunner } from 'typeorm';

export class StatsNonZeroTransactionsAndTrxPerSec1619533400357
  implements MigrationInterface {
  name = 'StatsNonZeroTransactionsAndTrxPerSec1619533400357';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_a1a981e779644ddd990180b9d4"`);
    await queryRunner.query(
      `CREATE TABLE "temporary_StatsEntity" ("id" varchar PRIMARY KEY NOT NULL, "difficulty" float NOT NULL, "gigaHashPerSec" varchar NOT NULL, "coinSupply" float NOT NULL, "btcPrice" float NOT NULL, "usdPrice" float NOT NULL, "marketCapInUSD" integer NOT NULL, "transactions" integer NOT NULL, "timestamp" integer NOT NULL, "nonZeroAddressesCount" float DEFAULT (0), "avgTransactionsPerSecond" float DEFAULT (0))`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_StatsEntity"("id", "difficulty", "gigaHashPerSec", "coinSupply", "btcPrice", "usdPrice", "marketCapInUSD", "transactions", "timestamp") SELECT "id", "difficulty", "gigaHashPerSec", "coinSupply", "btcPrice", "usdPrice", "marketCapInUSD", "transactions", "timestamp" FROM "StatsEntity"`,
    );
    await queryRunner.query(`DROP TABLE "StatsEntity"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_StatsEntity" RENAME TO "StatsEntity"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a1a981e779644ddd990180b9d4" ON "StatsEntity" ("timestamp") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_a1a981e779644ddd990180b9d4"`);
    await queryRunner.query(
      `ALTER TABLE "StatsEntity" RENAME TO "temporary_StatsEntity"`,
    );
    await queryRunner.query(
      `CREATE TABLE "StatsEntity" ("id" varchar PRIMARY KEY NOT NULL, "difficulty" float NOT NULL, "gigaHashPerSec" varchar NOT NULL, "coinSupply" float NOT NULL, "btcPrice" float NOT NULL, "usdPrice" float NOT NULL, "marketCapInUSD" integer NOT NULL, "transactions" integer NOT NULL, "timestamp" integer NOT NULL)`,
    );
    await queryRunner.query(
      `INSERT INTO "StatsEntity"("id", "difficulty", "gigaHashPerSec", "coinSupply", "btcPrice", "usdPrice", "marketCapInUSD", "transactions", "timestamp") SELECT "id", "difficulty", "gigaHashPerSec", "coinSupply", "btcPrice", "usdPrice", "marketCapInUSD", "transactions", "timestamp" FROM "temporary_StatsEntity"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_StatsEntity"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_a1a981e779644ddd990180b9d4" ON "StatsEntity" ("timestamp") `,
    );
  }
}
