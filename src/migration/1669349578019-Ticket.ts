import { MigrationInterface, QueryRunner } from 'typeorm';

export class Ticket1669349578019 implements MigrationInterface {
  name = 'Ticket1669349578019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "TicketEntity" ("id" varchar PRIMARY KEY NOT NULL, "type" varchar NOT NULL, "height" integer NOT NULL, "rawData" varchar NOT NULL, "timestamp" integer NOT NULL, "transactionHash" varchar(64) NOT NULL, "signature" varchar NOT NULL, "pastelID" varchar)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_34fc98f7cb33c738a8ec9e582d" ON "TicketEntity" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_26d9b319aeb4b1ddab717ca6d2" ON "TicketEntity" ("transactionHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e863a62ecdf9a789db00434383" ON "TicketEntity" ("height") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7de42bf3d703228a379a82860a" ON "TicketEntity" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78e3a0286c4a1bd9f1cb213205" ON "TicketEntity" ("signature") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_06cee27c1ef2995cf867ea641c" ON "TicketEntity" ("pastelID") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_06cee27c1ef2995cf867ea641c"`);
    await queryRunner.query(`DROP INDEX "IDX_78e3a0286c4a1bd9f1cb213205"`);
    await queryRunner.query(`DROP INDEX "IDX_7de42bf3d703228a379a82860a"`);
    await queryRunner.query(`DROP INDEX "IDX_e863a62ecdf9a789db00434383"`);
    await queryRunner.query(`DROP INDEX "IDX_26d9b319aeb4b1ddab717ca6d2"`);
    await queryRunner.query(`DROP INDEX "IDX_34fc98f7cb33c738a8ec9e582d"`);
    await queryRunner.query(`DROP TABLE "TicketEntity"`);
  }
}
