import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransactionTimeForSense1676958004536
  implements MigrationInterface
{
  name = 'AddTransactionTimeForSense1676958004536';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.query(
      `PRAGMA table_info(SenseRequestsEntity)`,
    );
    const transactionTimeField = table.find(t => t.name === 'transactionTime');
    if (!transactionTimeField) {
      await queryRunner.query(
        `ALTER TABLE "SenseRequestsEntity" ADD transactionTime integer NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // noop
  }
}
