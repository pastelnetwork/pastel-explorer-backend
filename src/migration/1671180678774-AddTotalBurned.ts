import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTotalBurned1671180678774 implements MigrationInterface {
  name = 'AddTotalBurned1671180678774';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const statsEntityTable = await queryRunner.query(
      `PRAGMA table_info(StatsEntity)`,
    );
    const totalBurnedPSLField = statsEntityTable.find(
      t => t.name === 'totalBurnedPSL',
    );
    if (!totalBurnedPSLField) {
      await queryRunner.query(
        `ALTER TABLE "StatsEntity" ADD totalBurnedPSL number NULL DEFAULT (0)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // noop
  }
}
