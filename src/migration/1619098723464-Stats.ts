import { MigrationInterface, QueryRunner } from 'typeorm';

export class Stats1619098723464 implements MigrationInterface {
  name = 'Stats1619098723464';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "StatsEntity" ("id" varchar PRIMARY KEY NOT NULL, "difficulty" float NOT NULL, "gigaHashPerSec" varchar NOT NULL, "coinSupply" float NOT NULL, "btcPrice" float NOT NULL, "usdPrice" float NOT NULL, "marketCapInUSD" integer NOT NULL, "transactions" integer NOT NULL, "timestamp" integer NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a1a981e779644ddd990180b9d4" ON "StatsEntity" ("timestamp") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_a1a981e779644ddd990180b9d4"`);
    await queryRunner.query(`DROP TABLE "StatsEntity"`);
  }
}
