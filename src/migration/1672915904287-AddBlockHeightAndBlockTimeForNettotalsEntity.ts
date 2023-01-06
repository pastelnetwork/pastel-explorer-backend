import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBlockHeightAndBlockTimeForNettotalsEntity1672915904287
  implements MigrationInterface
{
  name = 'AddBlockHeightAndBlockTimeForNettotalsEntity1672915904287';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const nettotalsTable = await queryRunner.query(
      `PRAGMA table_info(NettotalsEntity)`,
    );
    const blockHeightField = nettotalsTable.find(t => t.name === 'blockHeight');
    if (!blockHeightField) {
      await queryRunner.query(
        `ALTER TABLE "NettotalsEntity" ADD blockHeight number NOT NULL DEFAULT(0)`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_868549a1629dc0a816c2beeec2" ON "NettotalsEntity" ("blockHeight") `,
      );
    }
    const blockTimeField = nettotalsTable.find(t => t.name === 'blockTime');
    if (!blockTimeField) {
      await queryRunner.query(
        `ALTER TABLE "NettotalsEntity" ADD blockTime number NOT NULL DEFAULT(0)`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_6a6e4907a4fd52e5bf81f9c4d8" ON "NettotalsEntity" ("blockTime") `,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_6a6e4907a4fd52e5bf81f9c4d8"`);
    await queryRunner.query(`DROP INDEX "IDX_868549a1629dc0a816c2beeec2"`);
  }
}
