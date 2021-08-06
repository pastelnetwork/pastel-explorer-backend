import { MigrationInterface, QueryRunner } from 'typeorm';

export class TransactionsSizeFeeColumns1625828896458
  implements MigrationInterface
{
  name = 'TransactionsSizeFeeColumns1625828896458';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.commitTransaction();
    await queryRunner.query('PRAGMA foreign_keys=off');
    await queryRunner.startTransaction();
    await queryRunner.query(`DROP INDEX "IDX_93e785bb1252f2872c5a723cd5"`);
    await queryRunner.query(`DROP INDEX "IDX_d365e1597c0c334ffca5947e89"`);
    await queryRunner.query(`DROP INDEX "IDX_3c25c62421fb7a3037e333dc12"`);
    await queryRunner.query(`DROP INDEX "IDX_a77a8b54eab4d2c13cf2c8d63a"`);
    await queryRunner.query(
      `CREATE TABLE "temporary_Transaction" ("id" varchar(64) PRIMARY KEY NOT NULL, "timestamp" integer NOT NULL, "coinbase" integer, "totalAmount" integer NOT NULL, "recipientCount" integer NOT NULL, "blockHash" varchar, "rawData" varchar NOT NULL, "isNonStandard" integer, "unconfirmedTransactionDetails" varchar, "size" integer, "fee" float, CONSTRAINT "FK_3c25c62421fb7a3037e333dc128" FOREIGN KEY ("blockHash") REFERENCES "Block" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_Transaction"("id", "timestamp", "coinbase", "totalAmount", "recipientCount", "blockHash", "rawData", "isNonStandard", "unconfirmedTransactionDetails") SELECT "id", "timestamp", "coinbase", "totalAmount", "recipientCount", "blockHash", "rawData", "isNonStandard", "unconfirmedTransactionDetails" FROM "Transaction"`,
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
    await queryRunner.query(
      `CREATE INDEX "IDX_a77a8b54eab4d2c13cf2c8d63a" ON "Transaction" ("totalAmount") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.commitTransaction();
    await queryRunner.query('PRAGMA foreign_keys=off');
    await queryRunner.startTransaction();
    await queryRunner.query(`DROP INDEX "IDX_a77a8b54eab4d2c13cf2c8d63a"`);
    await queryRunner.query(`DROP INDEX "IDX_3c25c62421fb7a3037e333dc12"`);
    await queryRunner.query(`DROP INDEX "IDX_d365e1597c0c334ffca5947e89"`);
    await queryRunner.query(`DROP INDEX "IDX_93e785bb1252f2872c5a723cd5"`);
    await queryRunner.query(
      `ALTER TABLE "Transaction" RENAME TO "temporary_Transaction"`,
    );
    await queryRunner.query(
      `CREATE TABLE "Transaction" ("id" varchar(64) PRIMARY KEY NOT NULL, "timestamp" integer NOT NULL, "coinbase" integer, "totalAmount" integer NOT NULL, "recipientCount" integer NOT NULL, "blockHash" varchar, "rawData" varchar NOT NULL, "isNonStandard" integer, "unconfirmedTransactionDetails" varchar, CONSTRAINT "FK_3c25c62421fb7a3037e333dc128" FOREIGN KEY ("blockHash") REFERENCES "Block" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `INSERT INTO "Transaction"("id", "timestamp", "coinbase", "totalAmount", "recipientCount", "blockHash", "rawData", "isNonStandard", "unconfirmedTransactionDetails") SELECT "id", "timestamp", "coinbase", "totalAmount", "recipientCount", "blockHash", "rawData", "isNonStandard", "unconfirmedTransactionDetails" FROM "temporary_Transaction"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_Transaction"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_a77a8b54eab4d2c13cf2c8d63a" ON "Transaction" ("totalAmount") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3c25c62421fb7a3037e333dc12" ON "Transaction" ("blockHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d365e1597c0c334ffca5947e89" ON "Transaction" ("recipientCount") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_93e785bb1252f2872c5a723cd5" ON "Transaction" ("timestamp") `,
    );
  }
}
