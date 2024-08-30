import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTicketEntity1723178877431 implements MigrationInterface {
  name = 'AlterTicketEntity1723178877431';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "TicketEntity" ADD "sub_type" varchar default null`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_693cf8a6534382dbcecc5f225e" ON "TicketEntity" ("sub_type") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_693cf8a6534382dbcecc5f225e"`);
    await queryRunner.query(
      `ALTER TABLE "TicketEntity" DROP COLUMN "sub_type"`,
    );
  }
}
