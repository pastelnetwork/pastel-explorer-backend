import { MigrationInterface, QueryRunner } from 'typeorm';

export class HistoricalMarketEntity1682404612021 implements MigrationInterface {
  name = 'HistoricalMarketEntity1682404612021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "HistoricalMarketEntity" ("id" varchar PRIMARY KEY NOT NULL, "period1d" varchar NOT NULL, "period7d" varchar NOT NULL, "period14d" varchar NOT NULL, "period30d" varchar NOT NULL, "period90d" varchar NOT NULL, "period180d" varchar NOT NULL, "period1y" varchar NOT NULL, "periodmax" varchar NOT NULL, "createdAt" integer NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ef62b1bf9db5d8e340261753ad" ON "HistoricalMarketEntity" ("createdAt") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_ef62b1bf9db5d8e340261753ad"`);
    await queryRunner.query(`DROP TABLE "HistoricalMarketEntity"`);
  }
}
