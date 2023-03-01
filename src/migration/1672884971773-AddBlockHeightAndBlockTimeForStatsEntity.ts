import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBlockHeightAndBlockTimeForStatsEntity1672884971773
  implements MigrationInterface
{
  name = 'AddBlockHeightAndBlockTimeForStatsEntity1672884971773';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const statsTable = await queryRunner.query(
      `PRAGMA table_info(StatsEntity)`,
    );
    const blockHeightField = statsTable.find(t => t.name === 'blockHeight');
    if (!blockHeightField) {
      await queryRunner.query(
        `ALTER TABLE "StatsEntity" ADD blockHeight number NOT NULL DEFAULT(0)`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_25f9b8b37869e127a8572bdb59" ON "StatsEntity" ("blockHeight") `,
      );
    }
    const blockTimeField = statsTable.find(t => t.name === 'blockTime');
    if (!blockTimeField) {
      await queryRunner.query(
        `ALTER TABLE "StatsEntity" ADD blockTime number NOT NULL DEFAULT(0)`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_97b4688f431ecb4b24cc065740" ON "StatsEntity" ("blockTime") `,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_97b4688f431ecb4b24cc065740"`);
    await queryRunner.query(`DROP INDEX "IDX_25f9b8b37869e127a8572bdb59"`);
  }
}
