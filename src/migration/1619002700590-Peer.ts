import { MigrationInterface, QueryRunner } from 'typeorm';

export class Peer1619002700590 implements MigrationInterface {
  name = 'Peer1619002700590';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "Peer" ("id" varchar PRIMARY KEY NOT NULL, "nodeId" integer NOT NULL, "ip" varchar NOT NULL, "country" varchar NOT NULL, "city" varchar NOT NULL, "latitude" float NOT NULL, "longitude" float NOT NULL, "protocol" varchar NOT NULL, "version" float NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_323d6d1700d8a17ec1b30d3bd2" ON "Peer" ("ip") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_323d6d1700d8a17ec1b30d3bd2"`);
    await queryRunner.query(`DROP TABLE "Peer"`);
  }
}
