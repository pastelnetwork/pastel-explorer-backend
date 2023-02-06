import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterMasternode1671096430484 implements MigrationInterface {
  name = 'AlterMasternode1671096430484';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.query(`PRAGMA table_info(Block)`);
    const totalTicketsField = table.find(t => t.name === 'totalTickets');
    if (!totalTicketsField) {
      await queryRunner.query(
        `ALTER TABLE "Block" ADD totalTickets number NULL DEFAULT(0)`,
      );
    }
    const ticketsListField = table.find(t => t.name === 'ticketsList');
    if (!ticketsListField) {
      await queryRunner.query(
        `ALTER TABLE "Block" ADD ticketsList varchar NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // noop
  }
}
