import { MigrationInterface, QueryRunner } from 'typeorm';

export class Hashrate1665632238032 implements MigrationInterface {
  name = 'Hashrate1665632238032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "HashrateEntity" ("id" varchar PRIMARY KEY NOT NULL, "networksolps5" integer, "networksolps10" integer, "networksolps25" integer, "networksolps50" integer, "networksolps100" integer, "networksolps500" integer, "networksolps1000" integer, "timestamp" integer NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_73b0520b577d6041b7012e06ab" ON "HashrateEntity" ("networksolps5")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6db4dcb34d11d9993331cccb9d" ON "HashrateEntity" ("networksolps10")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5b80813cc16aebca2d9837182c" ON "HashrateEntity" ("networksolps25")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0f18325614c98bd1493eee7741" ON "HashrateEntity" ("networksolps50")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b83f49f65ed6d4c07b457de25b" ON "HashrateEntity" ("networksolps100")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ea75a97cd14f798844d15ddb1d" ON "HashrateEntity" ("networksolps500")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1d04b609e64cd71c91b8161957" ON "HashrateEntity" ("networksolps1000")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ffca6182cbd1ecebd41fcb746f" ON "HashrateEntity" ("timestamp")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_73b0520b577d6041b7012e06ab"`);
    await queryRunner.query(`DROP INDEX "IDX_6db4dcb34d11d9993331cccb9d"`);
    await queryRunner.query(`DROP INDEX "IDX_5b80813cc16aebca2d9837182c"`);
    await queryRunner.query(`DROP INDEX "IDX_0f18325614c98bd1493eee7741"`);
    await queryRunner.query(`DROP INDEX "IDX_b83f49f65ed6d4c07b457de25b"`);
    await queryRunner.query(`DROP INDEX "IDX_ea75a97cd14f798844d15ddb1d"`);
    await queryRunner.query(`DROP INDEX "IDX_1d04b609e64cd71c91b8161957"`);
    await queryRunner.query(`DROP INDEX "IDX_ffca6182cbd1ecebd41fcb746f"`);
    await queryRunner.query(`DROP TABLE "HashrateEntity"`);
  }
}
