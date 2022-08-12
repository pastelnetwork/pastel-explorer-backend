import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterMasternode1660290009980 implements MigrationInterface {
  name = 'AlterMasternode1660290009980';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Masternode" ADD masternodecreated number NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // noop
  }
}
