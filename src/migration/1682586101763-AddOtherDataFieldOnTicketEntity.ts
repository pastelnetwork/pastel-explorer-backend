import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOtherDataFieldOnTicketEntity1682586101763
  implements MigrationInterface
{
  name = 'AddOtherDataFieldOnTicketEntity1682586101763';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.query(`PRAGMA table_info(TicketEntity)`);
    const otherDataField = table.find(t => t.name === 'otherData');
    if (!otherDataField) {
      await queryRunner.query(
        `ALTER TABLE "TicketEntity" ADD otherData varchar NULL`,
      );
    }
  }

  public async down(): Promise<void> {
    // noop
  }
}
