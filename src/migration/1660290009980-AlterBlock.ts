import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterMasternode1670232254334 implements MigrationInterface {
  name = 'AlterMasternode1670232254334';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.query(`PRAGMA table_info(Block)`);
    const totalTicketsField = table.find(t => t.name === 'totalTickets');
    if (!totalTicketsField) {
      await queryRunner.query(
        `ALTER TABLE "Block" ADD totalTickets number NULL DEFAULT(0)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // noop
  }
}
