import { MigrationInterface, QueryRunner } from 'typeorm';

export class RegisteredCascadeFilesEntity1677217582902
  implements MigrationInterface
{
  name = 'RegisteredCascadeFilesEntity1677217582902';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "RegisteredCascadeFilesEntity" ("id" varchar PRIMARY KEY NOT NULL, "numberOfRegistered" integer NOT NULL, "totalNumberOfRegistered" integer NOT NULL, "dataSize" integer NOT NULL, "dataSizeBytesCounter" integer NOT NULL, "averageFileSize" integer NOT NULL, "averageFileSizeInBytes" integer NOT NULL, "blockHeight" integer NOT NULL, "blockTime" integer NOT NULL, "rawData" varchar NOT NULL, "timestamp" integer NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e8fd66f13b1e349de6ba849ef3" ON "RegisteredCascadeFilesEntity" ("numberOfRegistered") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_30873627d6d65bd46e9af031d0" ON "RegisteredCascadeFilesEntity" ("totalNumberOfRegistered") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_70da596ad3bf93d368d225bd98" ON "RegisteredCascadeFilesEntity" ("dataSize") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_06b47ddc7f8264877fdcf5c29f" ON "RegisteredCascadeFilesEntity" ("dataSizeBytesCounter") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0f75f7bf6fd76a0797f1af326f" ON "RegisteredCascadeFilesEntity" ("averageFileSize") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f187a09b60d0e04a0a0f34779e" ON "RegisteredCascadeFilesEntity" ("averageFileSizeInBytes") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3898dd951dbb6c228996b6ad1d" ON "RegisteredCascadeFilesEntity" ("blockHeight") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_03d5a0e43b52b4bba41ffecc89" ON "RegisteredCascadeFilesEntity" ("timestamp") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_03d5a0e43b52b4bba41ffecc89"`);
    await queryRunner.query(`DROP INDEX "IDX_3898dd951dbb6c228996b6ad1d"`);
    await queryRunner.query(`DROP INDEX "IDX_f187a09b60d0e04a0a0f34779e"`);
    await queryRunner.query(`DROP INDEX "IDX_0f75f7bf6fd76a0797f1af326f"`);
    await queryRunner.query(`DROP INDEX "IDX_06b47ddc7f8264877fdcf5c29f"`);
    await queryRunner.query(`DROP INDEX "IDX_70da596ad3bf93d368d225bd98"`);
    await queryRunner.query(`DROP INDEX "IDX_30873627d6d65bd46e9af031d0"`);
    await queryRunner.query(`DROP INDEX "IDX_e8fd66f13b1e349de6ba849ef3"`);
    await queryRunner.query(`DROP TABLE "RegisteredCascadeFilesEntity"`);
  }
}
