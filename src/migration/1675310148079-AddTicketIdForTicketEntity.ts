import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTicketIdForTicketEntity1675310148079
  implements MigrationInterface
{
  name = 'AddTicketIdForTicketEntity1675310148079';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.query(`PRAGMA table_info(TicketEntity)`);
    const ticketIdField = table.find(t => t.name === 'ticketId');
    if (!ticketIdField) {
      await queryRunner.query(
        `ALTER TABLE "TicketEntity" ADD ticketId varchar NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // noop
  }
}
