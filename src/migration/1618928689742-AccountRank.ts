import { MigrationInterface, QueryRunner } from 'typeorm';

export class AccountRank1618928689742 implements MigrationInterface {
  name = 'AccountRank1618928689742';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "AccountRank" ("id" varchar PRIMARY KEY NOT NULL, "rank" integer NOT NULL, "percentage" float NOT NULL, "amount" float, "address" varchar NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2631fc817f5205337ac33a13b7" ON "AccountRank" ("rank") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3b2e4dea90bfcc2478fd8d6939" ON "AccountRank" ("address") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_3b2e4dea90bfcc2478fd8d6939"`);
    await queryRunner.query(`DROP INDEX "IDX_2631fc817f5205337ac33a13b7"`);
    await queryRunner.query(`DROP TABLE "AccountRank"`);
  }
}
