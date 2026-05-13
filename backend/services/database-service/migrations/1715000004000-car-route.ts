import { MigrationInterface, QueryRunner } from 'typeorm';

export class CarRoute1715000004000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`driving_school_cars\` ADD COLUMN \`route\` varchar(500) NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`driving_school_cars\` DROP COLUMN \`route\``,
    );
  }
}
