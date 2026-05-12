import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * MEBBIS-scraped students have no phone/email — the entity declares both as
 * nullable but the original synced schema set phone NOT NULL with no default,
 * causing INSERTs from /student-store/students/detail to fail with
 * ER_NO_DEFAULT_FOR_FIELD. Relax the columns to match the entity.
 */
export class StudentNullableContact1715000002000 implements MigrationInterface {
  name = 'StudentNullableContact1715000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.query(`
      SELECT COUNT(*) AS c FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'driving_school_students'
    `);
    if (!Number(tableExists?.[0]?.c)) return;

    await queryRunner.query(
      "ALTER TABLE `driving_school_students` MODIFY COLUMN `phone` varchar(255) NULL",
    );
    await queryRunner.query(
      "ALTER TABLE `driving_school_students` MODIFY COLUMN `email` varchar(255) NULL",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort: restore NOT NULL only if every existing row already has a value.
    const nullPhone = await queryRunner.query(
      "SELECT COUNT(*) AS c FROM `driving_school_students` WHERE `phone` IS NULL",
    );
    if (!Number(nullPhone?.[0]?.c)) {
      await queryRunner.query(
        "ALTER TABLE `driving_school_students` MODIFY COLUMN `phone` varchar(255) NOT NULL",
      );
    }
  }
}
