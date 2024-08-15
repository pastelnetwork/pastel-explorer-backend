import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterCascadeEntity1723100412021 implements MigrationInterface {
  name = 'AlterCascadeEntity1723100412021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "CascadeEntity" ADD "sub_type" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "CascadeEntity" ADD "tx_info" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "CascadeEntity" ADD "sha3_256_hash_of_original_file" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "CascadeEntity" ADD "volumes" varchar`,
    );
    await queryRunner.query(`ALTER TABLE "CascadeEntity" ADD "files" varchar`);
    await queryRunner.query(
      `CREATE INDEX "IDX_a75a5a62a12b41a39bbe9bbe3b" ON "CascadeEntity" ("sub_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a75a5a62a12b41a39bbe3b9ebe" ON "CascadeEntity" ("sha3_256_hash_of_original_file") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_a75a5a62a12b41a39bbe9bbe3b"`);
    await queryRunner.query(`DROP INDEX "IDX_a75a5a62a12b41a39bbe3b9ebe"`);
    await queryRunner.query(
      `ALTER TABLE "CascadeEntity" DROP COLUMN "sub_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "CascadeEntity" DROP COLUMN "tx_info"`,
    );
    await queryRunner.query(
      `ALTER TABLE "CascadeEntity" DROP COLUMN "sha3_256_hash_of_original_file"`,
    );
    await queryRunner.query(
      `ALTER TABLE "CascadeEntity" DROP COLUMN "volumes"`,
    );
    await queryRunner.query(`ALTER TABLE "CascadeEntity" DROP COLUMN "files"`);
  }
}
