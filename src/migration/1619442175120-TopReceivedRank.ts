import { MigrationInterface, QueryRunner } from 'typeorm';

export class TopReceivedRank1619442175120 implements MigrationInterface {
  name = 'TopReceivedRank1619442175120';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "AccountReceivedRank" ("id" varchar PRIMARY KEY NOT NULL, "rank" integer NOT NULL, "percentage" float NOT NULL, "amount" float, "address" varchar NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f3cfdca40cc367de1ee0a87030" ON "AccountReceivedRank" ("rank") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4973f533fbd65274291251aad3" ON "AccountReceivedRank" ("address") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_4973f533fbd65274291251aad3"`);
    await queryRunner.query(`DROP INDEX "IDX_f3cfdca40cc367de1ee0a87030"`);
    await queryRunner.query(`DROP TABLE "AccountReceivedRank"`);
  }
}
