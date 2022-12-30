import { MigrationInterface, QueryRunner } from 'typeorm';

export class CascadeEntity1671171264792 implements MigrationInterface {
  name = 'CascadeEntity1671171264792';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "CascadeEntity" ("id" varchar PRIMARY KEY NOT NULL, "cascadeId" varchar, "transactionHash" varchar NOT NULL, "rawData" varchar NOT NULL, "createdDate" integer NOT NULL, "lastUpdated" integer NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6fb212344236e42b83f3c9d845" ON "CascadeEntity" ("cascadeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a0085be794f441f4dbf02ab53c" ON "CascadeEntity" ("transactionHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_10ca18d11c41cd00b6db5da96e" ON "CascadeEntity" ("rawData") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6f1980e5952609875c1d8ca8b7" ON "CascadeEntity" ("createdDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d92d848871780e5045d70f54ec" ON "CascadeEntity" ("lastUpdated") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_d92d848871780e5045d70f54ec"`);
    await queryRunner.query(`DROP INDEX "IDX_6f1980e5952609875c1d8ca8b7"`);
    await queryRunner.query(`DROP INDEX "IDX_10ca18d11c41cd00b6db5da96e"`);
    await queryRunner.query(`DROP INDEX "IDX_a0085be794f441f4dbf02ab53c"`);
    await queryRunner.query(`DROP INDEX "IDX_6fb212344236e42b83f3c9d845"`);
    await queryRunner.query(`DROP TABLE "CascadeEntity"`);
  }
}
