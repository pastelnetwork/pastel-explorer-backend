import { MigrationInterface, QueryRunner } from 'typeorm';

export class NextBlockHashIndex1621434306704 implements MigrationInterface {
  name = 'NextBlockHashIndex1621434306704';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_aaacf1c454bef2a260fa561ef0" ON "Block" ("nextBlockHash") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_aaacf1c454bef2a260fa561ef0"`);
  }
}
