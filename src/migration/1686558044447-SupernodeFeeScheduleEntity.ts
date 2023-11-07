import { MigrationInterface, QueryRunner } from 'typeorm';

export class SupernodeFeeScheduleEntity1686558044447
  implements MigrationInterface
{
  name = 'SupernodeFeeScheduleEntity1686558044447';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "SupernodeFeeScheduleEntity" ("id" varchar PRIMARY KEY NOT NULL, "blockHeight" integer NOT NULL, "blockHash" varchar NOT NULL, "blockTime" integer NOT NULL, "feeDeflatorFactor" float NOT NULL, "pastelIdRegistrationFee" float, "usernameRegistrationFee" float, "usernameChangeFee" float, "createdDate" integer NOT NULL, "rawData" varchar NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8b8272881b82279a2f587205d7" ON "SupernodeFeeScheduleEntity" ("blockHeight") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8ace7190e8501d67f857679b63" ON "SupernodeFeeScheduleEntity" ("blockHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9b1bb77616fb82391860749d85" ON "SupernodeFeeScheduleEntity" ("blockTime") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6e66f5dee3929bf7163381ef46" ON "SupernodeFeeScheduleEntity" ("feeDeflatorFactor") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0c3f946cc945fcf427c13c7e4b" ON "SupernodeFeeScheduleEntity" ("pastelIdRegistrationFee") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_497a9db9117a546c49fb34c8c4" ON "SupernodeFeeScheduleEntity" ("usernameRegistrationFee") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4e91b518871e9475064ec7d732" ON "SupernodeFeeScheduleEntity" ("usernameChangeFee") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_92a67db012f47eee8a6b1c2570" ON "SupernodeFeeScheduleEntity" ("createdDate") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_92a67db012f47eee8a6b1c2570"`);
    await queryRunner.query(`DROP INDEX "IDX_4e91b518871e9475064ec7d732"`);
    await queryRunner.query(`DROP INDEX "IDX_497a9db9117a546c49fb34c8c4"`);
    await queryRunner.query(`DROP INDEX "IDX_0c3f946cc945fcf427c13c7e4b"`);
    await queryRunner.query(`DROP INDEX "IDX_6e66f5dee3929bf7163381ef46"`);
    await queryRunner.query(`DROP INDEX "IDX_9b1bb77616fb82391860749d85"`);
    await queryRunner.query(`DROP INDEX "IDX_8ace7190e8501d67f857679b63"`);
    await queryRunner.query(`DROP INDEX "IDX_8b8272881b82279a2f587205d7"`);
    await queryRunner.query(`DROP TABLE "SupernodeFeeScheduleEntity"`);
  }
}
