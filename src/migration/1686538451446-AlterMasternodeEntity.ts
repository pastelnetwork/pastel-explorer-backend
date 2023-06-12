import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterMasternodeEntity1686538451446 implements MigrationInterface {
  name = 'AlterMasternodeEntity1686538451446';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "temporary_Masternode" ("id" varchar PRIMARY KEY NOT NULL, "ip" varchar NOT NULL, "port" varchar NOT NULL, "country" varchar NOT NULL, "city" varchar NOT NULL, "latitude" float NOT NULL, "longitude" float NOT NULL, "status" varchar NOT NULL, "address" varchar NOT NULL, "lastPaidTime" integer NOT NULL, "lastPaidBlock" integer NOT NULL, "masternodecreated" integer, "protocolVersion" integer, "dateTimeLastSeen" integer, "activeSeconds" integer, "snPastelIdPubkey" varchar, "masternodeRank" integer, "rankAsOfBlockHeight" integer)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_Masternode"("id", "ip", "port", "country", "city", "latitude", "longitude", "status", "address", "lastPaidTime", "lastPaidBlock", "masternodecreated") SELECT "id", "ip", "port", "country", "city", "latitude", "longitude", "status", "address", "lastPaidTime", "lastPaidBlock", "masternodecreated" FROM "Masternode"`,
    );
    await queryRunner.query(`DROP TABLE "Masternode"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_Masternode" RENAME TO "Masternode"`,
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
    await queryRunner.query(
      `ALTER TABLE "Masternode" RENAME TO "temporary_Masternode"`,
    );
    await queryRunner.query(
      `CREATE TABLE "Masternode" ("id" varchar PRIMARY KEY NOT NULL, "ip" varchar NOT NULL, "port" varchar NOT NULL, "country" varchar NOT NULL, "city" varchar NOT NULL, "latitude" float NOT NULL, "longitude" float NOT NULL, "status" varchar NOT NULL, "address" varchar NOT NULL, "lastPaidTime" integer NOT NULL, "lastPaidBlock" integer NOT NULL, "masternodecreated" integer)`,
    );
    await queryRunner.query(
      `INSERT INTO "Masternode"("id", "ip", "port", "country", "city", "latitude", "longitude", "status", "address", "lastPaidTime", "lastPaidBlock", "masternodecreated") SELECT "id", "ip", "port", "country", "city", "latitude", "longitude", "status", "address", "lastPaidTime", "lastPaidBlock", "masternodecreated" FROM "temporary_Masternode"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_Masternode"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_37deffb5c2fc0f819709ba5f6a" ON "Masternode" ("port") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_687781a3e8cba8242859b53d59" ON "Masternode" ("ip") `,
    );
  }
}
