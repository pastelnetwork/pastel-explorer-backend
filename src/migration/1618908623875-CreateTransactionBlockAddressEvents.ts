import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransactionBlockAddressEvents1618908623875
  implements MigrationInterface
{
  name = 'CreateTransactionBlockAddressEvents1618908623875';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "Block" ("id" varchar(64) PRIMARY KEY NOT NULL, "timestamp" integer NOT NULL, "height" varchar NOT NULL, "confirmations" integer NOT NULL, "difficulty" varchar NOT NULL, "merkleRoot" varchar NOT NULL, "nextBlockHash" varchar, "previousBlockHash" varchar NOT NULL, "nonce" varchar NOT NULL, "solution" varchar NOT NULL, "size" integer NOT NULL, "transactionCount" integer NOT NULL)`,
    );
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
      `CREATE TABLE "Transaction" ("id" varchar(64) PRIMARY KEY NOT NULL, "timestamp" integer NOT NULL, "coinbase" integer, "totalAmount" integer NOT NULL, "recipientCount" integer NOT NULL, "blockHash" varchar NOT NULL, "rawData" varchar NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_93e785bb1252f2872c5a723cd5" ON "Transaction" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d365e1597c0c334ffca5947e89" ON "Transaction" ("recipientCount") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3c25c62421fb7a3037e333dc12" ON "Transaction" ("blockHash") `,
    );
    await queryRunner.query(
      `CREATE TABLE "AddressEvent" ("id" varchar PRIMARY KEY NOT NULL, "timestamp" integer NOT NULL, "amount" float, "transactionHash" varchar NOT NULL, "address" varchar(35) NOT NULL, "direction" varchar NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ec6f2bc67004ed3d8edc6df49a" ON "AddressEvent" ("transactionHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2b39c47b00b9f06e1861d49c7a" ON "AddressEvent" ("address") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_72ca4df77fcd75a3afd3c3c4ee" ON "AddressEvent" ("direction") `,
    );
    await queryRunner.query(`DROP INDEX "IDX_93e785bb1252f2872c5a723cd5"`);
    await queryRunner.query(`DROP INDEX "IDX_d365e1597c0c334ffca5947e89"`);
    await queryRunner.query(`DROP INDEX "IDX_3c25c62421fb7a3037e333dc12"`);
    await queryRunner.query(
      `CREATE TABLE "temporary_Transaction" ("id" varchar(64) PRIMARY KEY NOT NULL, "timestamp" integer NOT NULL, "coinbase" integer, "totalAmount" integer NOT NULL, "recipientCount" integer NOT NULL, "blockHash" varchar NOT NULL, "rawData" varchar NOT NULL, CONSTRAINT "FK_3c25c62421fb7a3037e333dc128" FOREIGN KEY ("blockHash") REFERENCES "Block" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_Transaction"("id", "timestamp", "coinbase", "totalAmount", "recipientCount", "blockHash", "rawData") SELECT "id", "timestamp", "coinbase", "totalAmount", "recipientCount", "blockHash", "rawData" FROM "Transaction"`,
    );
    await queryRunner.query(`DROP TABLE "Transaction"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_Transaction" RENAME TO "Transaction"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_93e785bb1252f2872c5a723cd5" ON "Transaction" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d365e1597c0c334ffca5947e89" ON "Transaction" ("recipientCount") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3c25c62421fb7a3037e333dc12" ON "Transaction" ("blockHash") `,
    );
    await queryRunner.query(`DROP INDEX "IDX_ec6f2bc67004ed3d8edc6df49a"`);
    await queryRunner.query(`DROP INDEX "IDX_2b39c47b00b9f06e1861d49c7a"`);
    await queryRunner.query(`DROP INDEX "IDX_72ca4df77fcd75a3afd3c3c4ee"`);
    await queryRunner.query(
      `CREATE TABLE "temporary_AddressEvent" ("id" varchar PRIMARY KEY NOT NULL, "timestamp" integer NOT NULL, "amount" float, "transactionHash" varchar NOT NULL, "address" varchar(35) NOT NULL, "direction" varchar NOT NULL, CONSTRAINT "FK_ec6f2bc67004ed3d8edc6df49ad" FOREIGN KEY ("transactionHash") REFERENCES "Transaction" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_AddressEvent"("id", "timestamp", "amount", "transactionHash", "address", "direction") SELECT "id", "timestamp", "amount", "transactionHash", "address", "direction" FROM "AddressEvent"`,
    );
    await queryRunner.query(`DROP TABLE "AddressEvent"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_AddressEvent" RENAME TO "AddressEvent"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ec6f2bc67004ed3d8edc6df49a" ON "AddressEvent" ("transactionHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2b39c47b00b9f06e1861d49c7a" ON "AddressEvent" ("address") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_72ca4df77fcd75a3afd3c3c4ee" ON "AddressEvent" ("direction") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_72ca4df77fcd75a3afd3c3c4ee"`);
    await queryRunner.query(`DROP INDEX "IDX_2b39c47b00b9f06e1861d49c7a"`);
    await queryRunner.query(`DROP INDEX "IDX_ec6f2bc67004ed3d8edc6df49a"`);
    await queryRunner.query(
      `ALTER TABLE "AddressEvent" RENAME TO "temporary_AddressEvent"`,
    );
    await queryRunner.query(
      `CREATE TABLE "AddressEvent" ("id" varchar PRIMARY KEY NOT NULL, "timestamp" integer NOT NULL, "amount" float, "transactionHash" varchar NOT NULL, "address" varchar(35) NOT NULL, "direction" varchar NOT NULL)`,
    );
    await queryRunner.query(
      `INSERT INTO "AddressEvent"("id", "timestamp", "amount", "transactionHash", "address", "direction") SELECT "id", "timestamp", "amount", "transactionHash", "address", "direction" FROM "temporary_AddressEvent"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_AddressEvent"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_72ca4df77fcd75a3afd3c3c4ee" ON "AddressEvent" ("direction") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2b39c47b00b9f06e1861d49c7a" ON "AddressEvent" ("address") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ec6f2bc67004ed3d8edc6df49a" ON "AddressEvent" ("transactionHash") `,
    );
    await queryRunner.query(`DROP INDEX "IDX_3c25c62421fb7a3037e333dc12"`);
    await queryRunner.query(`DROP INDEX "IDX_d365e1597c0c334ffca5947e89"`);
    await queryRunner.query(`DROP INDEX "IDX_93e785bb1252f2872c5a723cd5"`);
    await queryRunner.query(
      `ALTER TABLE "Transaction" RENAME TO "temporary_Transaction"`,
    );
    await queryRunner.query(
      `CREATE TABLE "Transaction" ("id" varchar(64) PRIMARY KEY NOT NULL, "timestamp" integer NOT NULL, "coinbase" integer, "totalAmount" integer NOT NULL, "recipientCount" integer NOT NULL, "blockHash" varchar NOT NULL, "rawData" varchar NOT NULL)`,
    );
    await queryRunner.query(
      `INSERT INTO "Transaction"("id", "timestamp", "coinbase", "totalAmount", "recipientCount", "blockHash", "rawData") SELECT "id", "timestamp", "coinbase", "totalAmount", "recipientCount", "blockHash", "rawData" FROM "temporary_Transaction"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_Transaction"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_3c25c62421fb7a3037e333dc12" ON "Transaction" ("blockHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d365e1597c0c334ffca5947e89" ON "Transaction" ("recipientCount") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_93e785bb1252f2872c5a723cd5" ON "Transaction" ("timestamp") `,
    );
    await queryRunner.query(`DROP INDEX "IDX_72ca4df77fcd75a3afd3c3c4ee"`);
    await queryRunner.query(`DROP INDEX "IDX_2b39c47b00b9f06e1861d49c7a"`);
    await queryRunner.query(`DROP INDEX "IDX_ec6f2bc67004ed3d8edc6df49a"`);
    await queryRunner.query(`DROP TABLE "AddressEvent"`);
    await queryRunner.query(`DROP INDEX "IDX_3c25c62421fb7a3037e333dc12"`);
    await queryRunner.query(`DROP INDEX "IDX_d365e1597c0c334ffca5947e89"`);
    await queryRunner.query(`DROP INDEX "IDX_93e785bb1252f2872c5a723cd5"`);
    await queryRunner.query(`DROP TABLE "Transaction"`);
    await queryRunner.query(`DROP INDEX "IDX_bf86038516ca86e0b167cce445"`);
    await queryRunner.query(`DROP INDEX "IDX_b34c537dc0dbe0e55e7e304f0e"`);
    await queryRunner.query(`DROP INDEX "IDX_52000557e2c0806b25861dbea0"`);
    await queryRunner.query(`DROP INDEX "IDX_455e2cbd43f112ac0ddae35b4c"`);
    await queryRunner.query(`DROP INDEX "IDX_420f17924dae0f2575f0e8eeea"`);
    await queryRunner.query(`DROP TABLE "Block"`);
  }
}
