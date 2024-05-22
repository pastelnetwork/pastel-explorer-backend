import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterMasternodeEntity1716274523146 implements MigrationInterface {
  name = 'AlterMasternodeEntity1716274523146';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`Masternode\` ADD \`pubkey\` varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE \`Masternode\` ADD \`extAddress\` varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE \`Masternode\` ADD \`extP2P\` varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`Masternode\` DROP COLUMN \`extP2P\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`Masternode\` DROP COLUMN \`extAddress\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`Masternode\` DROP COLUMN \`pubkey\``,
    );
  }
}
