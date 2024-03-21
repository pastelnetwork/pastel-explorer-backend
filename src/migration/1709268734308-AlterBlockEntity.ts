import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterBlockEntity1709268734308 implements MigrationInterface {
  name = 'AlterBlockEntity1709268734308';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "temporary_Block" ("id" varchar(64) PRIMARY KEY NOT NULL, "timestamp" integer NOT NULL, "height" varchar NOT NULL, "confirmations" integer NOT NULL, "difficulty" varchar NOT NULL, "merkleRoot" varchar NOT NULL, "nextBlockHash" varchar, "previousBlockHash" varchar NOT NULL, "nonce" varchar NOT NULL, "solution" varchar NOT NULL, "size" integer NOT NULL, "transactionCount" integer NOT NULL, "totalTickets" integer, "ticketsList" varchar, "type" varchar(10) DEFAULT ('other'))`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_Block"("id", "timestamp", "height", "confirmations", "difficulty", "merkleRoot", "nextBlockHash", "previousBlockHash", "nonce", "solution", "size", "transactionCount", "totalTickets", "ticketsList") SELECT "id", "timestamp", "height", "confirmations", "difficulty", "merkleRoot", "nextBlockHash", "previousBlockHash", "nonce", "solution", "size", "transactionCount", "totalTickets", "ticketsList" FROM "Block"`,
    );
    await queryRunner.query(`DROP TABLE "Block"`);
    await queryRunner.query(`ALTER TABLE "temporary_Block" RENAME TO "Block"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_420f17924dae0f2575f0e8eeea" ON "Block" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_455e2cbd43f112ac0ddae35b4c" ON "Block" ("height") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_52000557e2c0806b25861dbea0" ON "Block" ("merkleRoot") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b34c537dc0dbe0e55e7e304f0e" ON "Block" ("size") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bf86038516ca86e0b167cce445" ON "Block" ("transactionCount") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_12284238aac4818d384daf61e8" ON "Block" ("difficulty") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aaacf1c454bef2a260fa561ef0" ON "Block" ("nextBlockHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5589796c37078bce698d8b6926" ON "Block" ("type") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_5589796c37078bce698d8b6926"`);
    await queryRunner.query(`DROP INDEX "IDX_aaacf1c454bef2a260fa561ef0"`);
    await queryRunner.query(`DROP INDEX "IDX_12284238aac4818d384daf61e8"`);
    await queryRunner.query(`DROP INDEX "IDX_bf86038516ca86e0b167cce445"`);
    await queryRunner.query(`DROP INDEX "IDX_b34c537dc0dbe0e55e7e304f0e"`);
    await queryRunner.query(`DROP INDEX "IDX_52000557e2c0806b25861dbea0"`);
    await queryRunner.query(`DROP INDEX "IDX_455e2cbd43f112ac0ddae35b4c"`);
    await queryRunner.query(`DROP INDEX "IDX_420f17924dae0f2575f0e8eeea"`);
    await queryRunner.query(`ALTER TABLE "Block" RENAME TO "temporary_Block"`);
    await queryRunner.query(
      `CREATE TABLE "Block" ("id" varchar(64) PRIMARY KEY NOT NULL, "timestamp" integer NOT NULL, "height" varchar NOT NULL, "confirmations" integer NOT NULL, "difficulty" varchar NOT NULL, "merkleRoot" varchar NOT NULL, "nextBlockHash" varchar, "previousBlockHash" varchar NOT NULL, "nonce" varchar NOT NULL, "solution" varchar NOT NULL, "size" integer NOT NULL, "transactionCount" integer NOT NULL, "totalTickets" integer, "ticketsList" varchar)`,
    );
    await queryRunner.query(
      `INSERT INTO "Block"("id", "timestamp", "height", "confirmations", "difficulty", "merkleRoot", "nextBlockHash", "previousBlockHash", "nonce", "solution", "size", "transactionCount", "totalTickets", "ticketsList") SELECT "id", "timestamp", "height", "confirmations", "difficulty", "merkleRoot", "nextBlockHash", "previousBlockHash", "nonce", "solution", "size", "transactionCount", "totalTickets", "ticketsList" FROM "temporary_Block"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_Block"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_aaacf1c454bef2a260fa561ef0" ON "Block" ("nextBlockHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_12284238aac4818d384daf61e8" ON "Block" ("difficulty") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bf86038516ca86e0b167cce445" ON "Block" ("transactionCount") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b34c537dc0dbe0e55e7e304f0e" ON "Block" ("size") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_52000557e2c0806b25861dbea0" ON "Block" ("merkleRoot") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_455e2cbd43f112ac0ddae35b4c" ON "Block" ("height") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_420f17924dae0f2575f0e8eeea" ON "Block" ("timestamp") `,
    );
  }
}
