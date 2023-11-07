import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddressEntity1688014557142 implements MigrationInterface {
  name = 'AddressEntity1688014557142';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "AddressEntity" ("address" varchar PRIMARY KEY NOT NULL, "type" varchar NOT NULL, "totalSent" integer NOT NULL, "totalReceived" integer NOT NULL, "createdAt" integer NOT NULL DEFAULT (1688014565891), "updatedAt" integer NOT NULL DEFAULT (1688014565891))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ce5a5f397b4b8a4390a636e953" ON "AddressEntity" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_94fec939d050e3aebd628c3951" ON "AddressEntity" ("totalSent") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4b644cd5a98cbd3ee123142e18" ON "AddressEntity" ("totalReceived") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7fd1dc0ea6e208803c263b7d45" ON "AddressEntity" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dc081d293462bfa69d71bb5ff3" ON "AddressEntity" ("updatedAt") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_dc081d293462bfa69d71bb5ff3"`);
    await queryRunner.query(`DROP INDEX "IDX_7fd1dc0ea6e208803c263b7d45"`);
    await queryRunner.query(`DROP INDEX "IDX_4b644cd5a98cbd3ee123142e18"`);
    await queryRunner.query(`DROP INDEX "IDX_94fec939d050e3aebd628c3951"`);
    await queryRunner.query(`DROP INDEX "IDX_ce5a5f397b4b8a4390a636e953"`);
    await queryRunner.query(`DROP TABLE "AddressEntity"`);
  }
}
