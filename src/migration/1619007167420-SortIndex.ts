import { MigrationInterface, QueryRunner } from 'typeorm';

export class SortIndex1619007167420 implements MigrationInterface {
  name = 'SortIndex1619007167420';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_12284238aac4818d384daf61e8" ON "Block" ("difficulty") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a77a8b54eab4d2c13cf2c8d63a" ON "Transaction" ("totalAmount") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_a77a8b54eab4d2c13cf2c8d63a"`);
    await queryRunner.query(`DROP INDEX "IDX_12284238aac4818d384daf61e8"`);
  }
}
