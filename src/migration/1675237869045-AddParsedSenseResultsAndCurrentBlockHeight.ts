import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParsedSenseResultsAndCurrentBlockHeight1675237869045
  implements MigrationInterface
{
  name = 'AddParsedSenseResultsAndCurrentBlockHeight1675237869045';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.query(
      `PRAGMA table_info(SenseRequestsEntity)`,
    );
    const parsedSenseResultsField = table.find(
      t => t.name === 'parsedSenseResults',
    );
    if (!parsedSenseResultsField) {
      await queryRunner.query(
        `ALTER TABLE "SenseRequestsEntity" ADD parsedSenseResults varchar NULL`,
      );
    }
    const currentBlockHeightField = table.find(
      t => t.name === 'currentBlockHeight',
    );
    if (!currentBlockHeightField) {
      await queryRunner.query(
        `ALTER TABLE "SenseRequestsEntity" ADD currentBlockHeight integer NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // noop
  }
}
