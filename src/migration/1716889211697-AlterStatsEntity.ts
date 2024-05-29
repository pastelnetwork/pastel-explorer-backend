import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterStatsEntity1716889211697 implements MigrationInterface {
  name = 'AlterStatsEntity1716889211697';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`StatsEntity\` ADD \`lessPSLLockedByFoundation\` float DEFAULT (0)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_55cb256564d094d5031f61f5e9" ON "StatsEntity" ("lessPSLLockedByFoundation") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_55cb256564d094d5031f61f5e9"`);
    await queryRunner.query(
      `ALTER TABLE \`StatsEntity\` DROP COLUMN \`lessPSLLockedByFoundation\``,
    );
  }
}
