import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTransaction1688975111157 implements MigrationInterface {
  name = 'AlterTransaction1688975111157';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_b3352f72b541319d83c579d522" ON "Transaction" ("height") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_b3352f72b541319d83c579d522"`);
  }
}
