import { MigrationInterface, QueryRunner } from 'typeorm';

export class MinningAndMempool1624345073249 implements MigrationInterface {
  name = 'MinningAndMempool1624345073249';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "MiningInfoEntity" ("id" varchar PRIMARY KEY NOT NULL, "blocks" integer NOT NULL, "currentblocksize" integer NOT NULL, "currentblocktx" integer NOT NULL, "difficulty" float NOT NULL, "errors" text, "genproclimit" integer NOT NULL, "localsolps" integer NOT NULL, "networksolps" integer NOT NULL, "networkhashps" integer NOT NULL, "pooledtx" integer NOT NULL, "testnet" integer NOT NULL, "chain" varchar, "generate" text, "timestamp" integer NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fc7539a3da7e839f9f260d85bb" ON "MiningInfoEntity" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE TABLE "RawMemPoolInfoEntity" ("id" varchar PRIMARY KEY NOT NULL, "transactionid" varchar NOT NULL, "size" integer, "fee" integer, "time" integer, "height" integer, "startingpriority" integer, "currentpriority" integer, "depends" text, "timestamp" integer NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f274c2784c5d3c667062799c48" ON "RawMemPoolInfoEntity" ("timestamp") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_f274c2784c5d3c667062799c48"`);
    await queryRunner.query(`DROP TABLE "RawMemPoolInfoEntity"`);
    await queryRunner.query(`DROP INDEX "IDX_fc7539a3da7e839f9f260d85bb"`);
    await queryRunner.query(`DROP TABLE "MiningInfoEntity"`);
  }
}
