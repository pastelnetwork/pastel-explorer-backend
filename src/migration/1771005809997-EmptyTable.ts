import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTransaction1771005809997 implements MigrationInterface {
  name = 'AlterTransaction1771005809997';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM TicketEntity`);
    await queryRunner.query(`DELETE FROM SenseRequestsEntity`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // noop
  }
}
