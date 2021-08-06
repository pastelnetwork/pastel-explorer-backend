import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddressEventAmountIndex1619524507002
  implements MigrationInterface
{
  name = 'AddressEventAmountIndex1619524507002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_5e9ec1221933d26d97cc5ed94a" ON "AddressEvent" ("timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f882948852a02bcb50d43abe4d" ON "AddressEvent" ("amount") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_f882948852a02bcb50d43abe4d"`);
    await queryRunner.query(`DROP INDEX "IDX_5e9ec1221933d26d97cc5ed94a"`);
  }
}
