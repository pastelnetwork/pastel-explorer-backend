import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransactionTimeForTicket1675749123760
  implements MigrationInterface
{
  name = 'AddTransactionTimeForTicket1675749123760';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.query(`PRAGMA table_info(TicketEntity)`);
    const transactionTimeField = table.find(t => t.name === 'transactionTime');
    if (!transactionTimeField) {
      await queryRunner.query(
        `ALTER TABLE "TicketEntity" ADD transactionTime integer NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // noop
  }
}
