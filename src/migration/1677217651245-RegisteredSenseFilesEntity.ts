import { MigrationInterface, QueryRunner } from 'typeorm';

export class RegisteredSenseFilesEntity1677217651245
  implements MigrationInterface
{
  name = 'RegisteredSenseFilesEntity1677217651245';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "RegisteredSenseFilesEntity" ("id" varchar PRIMARY KEY NOT NULL, "numberOfRegisteredSenseFingerprints" integer NOT NULL, "totalNumberOfRegisteredSenseFingerprints" integer NOT NULL, "blockHeight" integer NOT NULL, "blockTime" integer NOT NULL, "rawData" varchar NOT NULL, "timestamp" integer NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5cc4699e127116493f1aef8906" ON "RegisteredSenseFilesEntity" ("numberOfRegisteredSenseFingerprints") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2dff6e0a4d2974b848232a31f3" ON "RegisteredSenseFilesEntity" ("totalNumberOfRegisteredSenseFingerprints") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a9a634360bf8f747092a022b64" ON "RegisteredSenseFilesEntity" ("blockHeight") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c2b927971ca45d58ddec7c0740" ON "RegisteredSenseFilesEntity" ("timestamp") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_c2b927971ca45d58ddec7c0740"`);
    await queryRunner.query(`DROP INDEX "IDX_a9a634360bf8f747092a022b64"`);
    await queryRunner.query(`DROP INDEX "IDX_2dff6e0a4d2974b848232a31f3"`);
    await queryRunner.query(`DROP INDEX "IDX_5cc4699e127116493f1aef8906"`);
    await queryRunner.query(`DROP TABLE "RegisteredSenseFilesEntity"`);
  }
}
