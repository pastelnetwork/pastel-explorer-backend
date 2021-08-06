import { MigrationInterface, QueryRunner } from 'typeorm';

export class MempoolInfoEntity1624358984980 implements MigrationInterface {
  name = 'MempoolInfoEntity1624358984980';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "MempoolInfoEntity" ("id" varchar PRIMARY KEY NOT NULL, "size" integer, "bytes" integer, "usage" integer, "timestamp" integer NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_736676653bb8a1e08ef1a6b605" ON "MempoolInfoEntity" ("timestamp") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_736676653bb8a1e08ef1a6b605"`);
    await queryRunner.query(`DROP TABLE "MempoolInfoEntity"`);
  }
}
