import { MigrationInterface, QueryRunner } from 'typeorm';

export class Nettotals1624524365821 implements MigrationInterface {
  name = 'Nettotals1624524365821';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "NettotalsEntity" ("id" varchar PRIMARY KEY NOT NULL, "totalbytesrecv" integer NOT NULL, "totalbytessent" integer NOT NULL, "timemillis" integer NOT NULL, "timestamp" integer NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e3af2ae4396d926b3493192cdf" ON "NettotalsEntity" ("timestamp") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_e3af2ae4396d926b3493192cdf"`);
    await queryRunner.query(`DROP TABLE "NettotalsEntity"`);
  }
}
