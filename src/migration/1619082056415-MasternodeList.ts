import { MigrationInterface, QueryRunner } from 'typeorm';

export class MasternodeList1619082056415 implements MigrationInterface {
  name = 'MasternodeList1619082056415';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "Masternode" ("id" varchar PRIMARY KEY NOT NULL, "ip" varchar NOT NULL, "port" varchar NOT NULL, "country" varchar NOT NULL, "city" varchar NOT NULL, "latitude" float NOT NULL, "longitude" float NOT NULL, "status" varchar NOT NULL, "address" varchar NOT NULL, "lastPaidTime" integer NOT NULL, "lastPaidBlock" integer NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_687781a3e8cba8242859b53d59" ON "Masternode" ("ip") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_37deffb5c2fc0f819709ba5f6a" ON "Masternode" ("port") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_37deffb5c2fc0f819709ba5f6a"`);
    await queryRunner.query(`DROP INDEX "IDX_687781a3e8cba8242859b53d59"`);
    await queryRunner.query(`DROP TABLE "Masternode"`);
  }
}
