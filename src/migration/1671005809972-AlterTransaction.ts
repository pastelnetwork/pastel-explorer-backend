import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTransaction1671005809972 implements MigrationInterface {
  name = 'AlterTransaction1671005809972';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const transactionTable = await queryRunner.query(
      'PRAGMA table_info(`Transaction`)',
    );
    const ticketsField = transactionTable.find(t => t.name === 'tickets');
    if (!ticketsField) {
      await queryRunner.query(
        'ALTER TABLE `Transaction` ADD tickets varchar NULL',
      );
    }
    const ticketsTotalField = transactionTable.find(
      t => t.name === 'ticketsTotal',
    );
    if (!ticketsTotalField) {
      await queryRunner.query(
        'ALTER TABLE `Transaction` ADD ticketsTotal integer NULL DEFAULT (0)',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // noop
  }
}
