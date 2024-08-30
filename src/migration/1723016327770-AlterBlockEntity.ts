import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterBlockEntity1723016327770 implements MigrationInterface {
  name = 'AlterBlockEntity1723016327770';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Block" ADD "timeInMinutesBetweenBlocks" integer`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_23a0e2d7730180d4dc4b816b72" ON "Block" ("timeInMinutesBetweenBlocks") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_23a0e2d7730180d4dc4b816b72"`);
    await queryRunner.query(
      `ALTER TABLE "Block" DROP COLUMN "timeInMinutesBetweenBlocks"`,
    );
  }
}
