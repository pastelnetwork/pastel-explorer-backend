import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTicketEntity1716010746254 implements MigrationInterface {
  name = 'AlterTicketEntity1716010746254';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`TicketEntity\` ADD \`status\` varchar(10) DEFAULT 'checked'`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_2b71da851c76f3b12236a188b1\` ON \`TicketEntity\` (\`status\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_2b71da851c76f3b12236a188b1"`);
    await queryRunner.query(
      `ALTER TABLE \`TicketEntity\` DROP COLUMN \`status\``,
    );
  }
}
