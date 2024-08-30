import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterCascadeEntity1724995764849 implements MigrationInterface {
  name = 'AlterCascadeEntity1724995764849';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "CascadeEntity" ADD "files" varchar`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "CascadeEntity" DROP COLUMN "files"`);
  }
}
