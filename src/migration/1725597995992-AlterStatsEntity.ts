import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterStatsEntity1725597995992 implements MigrationInterface {
  name = 'AlterStatsEntity1725597995992';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "StatsEntity" ADD "zeroAddressesCount" float DEFAULT (0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "StatsEntity" ADD "addressesCount" float DEFAULT (0)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3d50393b87b5df4ed592d1abef" ON "StatsEntity" ("zeroAddressesCount") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a69a5bba0ddce2e2b9802dad19" ON "StatsEntity" ("addressesCount") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_a69a5bba0ddce2e2b9802dad19"`);
    await queryRunner.query(`DROP INDEX "IDX_3d50393b87b5df4ed592d1abef"`);
    await queryRunner.query(
      `ALTER TABLE "StatsEntity" DROP COLUMN "addressesCount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "StatsEntity" DROP COLUMN "zeroAddressesCount"`,
    );
  }
}
