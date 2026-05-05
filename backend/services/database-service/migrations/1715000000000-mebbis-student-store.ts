import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Splits MEBBIS data out of driving_school_students into a new 1:1
 * driving_school_student_mebbis table plus normalized exam/lesson child tables.
 *
 * Safe in place — no DROP TABLE on student/car data, all existing rows preserved.
 *  1. Create the three new tables.
 *  2. Backfill driving_school_student_mebbis from the MEBBIS columns currently
 *     on driving_school_students (so any existing scraped data carries over).
 *  3. Drop the now-unused MEBBIS columns from driving_school_students.
 *  4. Add `source` enum to students and cars (default 'manual' for old rows).
 *  5. Swap the global UNIQUE on tc_number / plate_number for composite uniques
 *     scoped to school_id.
 *  6. Drop driving_school_student_integration_infos (only ever held random
 *     seeder JSON; no production consumer).
 */
export class MebbisStudentStore1715000000000 implements MigrationInterface {
  name = 'MebbisStudentStore1715000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 0. Bail out cleanly on a fresh DB ─────────────────────────────
    // This migration only makes sense when the legacy `driving_school_students`
    // table already exists (we ALTER it in-place). On a fresh DB the
    // `synchronize()` step that ran before us has already created the new
    // schema directly from entity decorators — our work is done.
    const parentExists = await queryRunner.query(`
      SELECT COUNT(*) AS c FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'driving_school_students'
    `);
    if (!Number(parentExists?.[0]?.c)) {
      console.log('[migration] driving_school_students does not exist — fresh DB, nothing to migrate.');
      return;
    }

    // ── 1. New tables ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`driving_school_student_mebbis\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`created_at\` int unsigned NULL,
        \`updated_at\` int unsigned NULL,
        \`deleted_at\` int unsigned NULL,
        \`student_id\` int NOT NULL,
        \`school_id\` int NOT NULL,
        \`mebbis_account_id\` varchar(255) NULL,
        \`has_detail\` tinyint NOT NULL DEFAULT 0,
        \`donem\` varchar(255) NULL,
        \`grup\` varchar(255) NULL,
        \`sube\` varchar(255) NULL,
        \`durum\` varchar(255) NULL,
        \`kurum\` varchar(500) NULL,
        \`mevcut_belge\` varchar(255) NULL,
        \`istenen_sertifika\` varchar(255) NULL,
        \`kurum_onay\` varchar(255) NULL,
        \`ilce_onay\` varchar(255) NULL,
        \`uygulama\` varchar(255) NULL,
        \`teorik_hak\` int NULL,
        \`uygulama_hak\` int NULL,
        \`esinav_hak\` int NULL,
        \`kayit_ucreti\` int NULL,
        \`last_list_seen_at\` int unsigned NULL,
        \`last_detail_seen_at\` int unsigned NULL,
        UNIQUE KEY \`uk_dssm_student\` (\`student_id\`),
        KEY \`idx_dssm_school\` (\`school_id\`),
        KEY \`idx_dssm_school_has_detail\` (\`school_id\`, \`has_detail\`),
        KEY \`idx_dssm_school_durum\` (\`school_id\`, \`durum\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_dssm_student\` FOREIGN KEY (\`student_id\`)
          REFERENCES \`driving_school_students\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`driving_school_student_mebbis_exams\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`created_at\` int unsigned NULL,
        \`updated_at\` int unsigned NULL,
        \`deleted_at\` int unsigned NULL,
        \`student_mebbis_id\` int NOT NULL,
        \`school_id\` int NOT NULL,
        \`donem\` varchar(255) NULL,
        \`sinav_kodu\` varchar(255) NULL,
        \`sinav_tarihi\` varchar(255) NULL,
        \`plaka\` varchar(255) NULL,
        \`usta_ogretici\` varchar(255) NULL,
        \`onay_durumu\` varchar(255) NULL,
        \`sinav_durumu\` varchar(255) NULL,
        \`sonuc\` varchar(255) NULL,
        KEY \`idx_dssme_school_date\` (\`school_id\`, \`sinav_tarihi\`),
        KEY \`idx_dssme_school_plaka\` (\`school_id\`, \`plaka\`),
        KEY \`idx_dssme_mebbis\` (\`student_mebbis_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_dssme_mebbis\` FOREIGN KEY (\`student_mebbis_id\`)
          REFERENCES \`driving_school_student_mebbis\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`driving_school_student_mebbis_lessons\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`created_at\` int unsigned NULL,
        \`updated_at\` int unsigned NULL,
        \`deleted_at\` int unsigned NULL,
        \`student_mebbis_id\` int NOT NULL,
        \`school_id\` int NOT NULL,
        \`donem\` varchar(255) NULL,
        \`grup_adi\` varchar(255) NULL,
        \`grup_baslama\` varchar(255) NULL,
        \`sube\` varchar(255) NULL,
        \`plaka\` varchar(255) NULL,
        \`ders_yeri\` varchar(255) NULL,
        \`ders_tarihi\` varchar(255) NULL,
        \`ders_saati\` varchar(255) NULL,
        \`personel\` varchar(255) NULL,
        \`egitim_turu\` varchar(255) NULL,
        KEY \`idx_dssml_school_date\` (\`school_id\`, \`ders_tarihi\`),
        KEY \`idx_dssml_school_plaka\` (\`school_id\`, \`plaka\`),
        KEY \`idx_dssml_school_personel\` (\`school_id\`, \`personel\`),
        KEY \`idx_dssml_mebbis\` (\`student_mebbis_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_dssml_mebbis\` FOREIGN KEY (\`student_mebbis_id\`)
          REFERENCES \`driving_school_student_mebbis\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // ── 2. Backfill MEBBIS snapshot from existing student rows ────────
    // Only insert if any old MEBBIS column has a non-null value, so
    // pre-existing rows that were never touched by MEBBIS stay clean.
    const hasMebbisCols = await queryRunner.query(`
      SELECT COUNT(*) AS c FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'driving_school_students'
        AND column_name = 'license_class'
    `);
    if (Number(hasMebbisCols?.[0]?.c) > 0) {
      await queryRunner.query(`
        INSERT INTO \`driving_school_student_mebbis\`
          (student_id, school_id, has_detail, donem, istenen_sertifika, durum,
           kurum_onay, ilce_onay, uygulama_hak, esinav_hak,
           last_detail_seen_at, created_at, updated_at)
        SELECT
          s.id, s.school_id,
          CASE WHEN s.last_synced_at IS NOT NULL THEN 1 ELSE 0 END,
          s.donem, s.license_class, s.mebbis_status,
          s.approval_status, s.ilce_mem_approval,
          CAST(NULLIF(s.practice_rights, '') AS UNSIGNED),
          CAST(NULLIF(s.eexam_rights, '') AS UNSIGNED),
          s.last_synced_at,
          UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
        FROM \`driving_school_students\` s
        WHERE s.donem IS NOT NULL
           OR s.license_class IS NOT NULL
           OR s.mebbis_status IS NOT NULL
           OR s.approval_status IS NOT NULL
           OR s.ilce_mem_approval IS NOT NULL
           OR s.last_synced_at IS NOT NULL
      `);
    }

    // ── 3. Drop migrated columns from students ────────────────────────
    const dropColIfExists = async (col: string) => {
      const exists = await queryRunner.query(`
        SELECT COUNT(*) AS c FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'driving_school_students'
          AND column_name = ?
      `, [col]);
      if (Number(exists?.[0]?.c) > 0) {
        await queryRunner.query(`ALTER TABLE \`driving_school_students\` DROP COLUMN \`${col}\``);
      }
    };
    for (const col of [
      'donem', 'donem_text', 'license_class', 'mebbis_status', 'approval_status',
      'ilce_mem_approval', 'exam_date', 'criminal_record_check', 'practice_lessons',
      'practice_rights', 'eexam_rights', 'last_synced_at',
    ]) {
      await dropColIfExists(col);
    }

    // ── 4. Add `source` enums ─────────────────────────────────────────
    const hasSourceOnStudents = await queryRunner.query(`
      SELECT COUNT(*) AS c FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'driving_school_students'
        AND column_name = 'source'
    `);
    if (!Number(hasSourceOnStudents?.[0]?.c)) {
      await queryRunner.query(`
        ALTER TABLE \`driving_school_students\`
          ADD COLUMN \`source\` ENUM('manual','mebbis_scrape') NOT NULL DEFAULT 'manual'
      `);
    }

    const hasSourceOnCars = await queryRunner.query(`
      SELECT COUNT(*) AS c FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'driving_school_cars'
        AND column_name = 'source'
    `);
    if (!Number(hasSourceOnCars?.[0]?.c)) {
      await queryRunner.query(`
        ALTER TABLE \`driving_school_cars\`
          ADD COLUMN \`source\` ENUM('manual','mebbis_scrape') NOT NULL DEFAULT 'manual'
      `);
    }

    // Make cars.model nullable (was NOT NULL); scraped plates have no model.
    await queryRunner.query(`
      ALTER TABLE \`driving_school_cars\` MODIFY COLUMN \`model\` varchar(255) NULL
    `);

    // ── 5. Swap unique constraints to composite (school_id, ...) ──────
    const dropUniqueIfExists = async (table: string, indexName: string) => {
      const rows = await queryRunner.query(`
        SHOW INDEX FROM \`${table}\` WHERE Key_name = ?
      `, [indexName]);
      if (rows?.length) {
        await queryRunner.query(`ALTER TABLE \`${table}\` DROP INDEX \`${indexName}\``);
      }
    };
    // The exact index name TypeORM picked for the original UNIQUE varies
    // ("IDX_..." auto-named); discover dynamically.
    const findUniqueOn = async (table: string, column: string): Promise<string | null> => {
      const rows = await queryRunner.query(`
        SELECT INDEX_NAME FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = ?
          AND column_name = ? AND non_unique = 0
        LIMIT 1
      `, [table, column]);
      return rows?.[0]?.INDEX_NAME || null;
    };

    const studentsTcUnique = await findUniqueOn('driving_school_students', 'tc_number');
    if (studentsTcUnique) {
      await dropUniqueIfExists('driving_school_students', studentsTcUnique);
    }
    await queryRunner.query(`
      CREATE UNIQUE INDEX \`uk_dss_school_tc\`
        ON \`driving_school_students\` (\`school_id\`, \`tc_number\`)
    `);

    const carsPlateUnique = await findUniqueOn('driving_school_cars', 'plate_number');
    if (carsPlateUnique) {
      await dropUniqueIfExists('driving_school_cars', carsPlateUnique);
    }
    await queryRunner.query(`
      CREATE UNIQUE INDEX \`uk_dsc_school_plate\`
        ON \`driving_school_cars\` (\`school_id\`, \`plate_number\`)
    `);

    // ── 6. Drop integration_infos (random seeder JSON only) ───────────
    await queryRunner.query(`DROP TABLE IF EXISTS \`driving_school_student_integration_infos\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort rollback. Note: we cannot recover the random integration_data
    // blobs that the old seeder produced — they're treated as disposable.

    // 6. Recreate integration_infos shell
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`driving_school_student_integration_infos\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`created_at\` int unsigned NULL,
        \`updated_at\` int unsigned NULL,
        \`deleted_at\` int unsigned NULL,
        \`external_id\` varchar(255) NOT NULL,
        \`integration_data\` longtext NOT NULL,
        \`student_id\` int NOT NULL UNIQUE,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // 5. Restore single-column uniques
    await queryRunner.query(`DROP INDEX \`uk_dsc_school_plate\` ON \`driving_school_cars\``).catch(() => undefined);
    await queryRunner.query(`CREATE UNIQUE INDEX \`uq_dsc_plate\` ON \`driving_school_cars\` (\`plate_number\`)`);
    await queryRunner.query(`DROP INDEX \`uk_dss_school_tc\` ON \`driving_school_students\``).catch(() => undefined);
    await queryRunner.query(`CREATE UNIQUE INDEX \`uq_dss_tc\` ON \`driving_school_students\` (\`tc_number\`)`);

    // 4. Drop source columns
    await queryRunner.query(`ALTER TABLE \`driving_school_cars\` DROP COLUMN \`source\``).catch(() => undefined);
    await queryRunner.query(`ALTER TABLE \`driving_school_students\` DROP COLUMN \`source\``).catch(() => undefined);
    await queryRunner.query(`ALTER TABLE \`driving_school_cars\` MODIFY COLUMN \`model\` varchar(255) NOT NULL`).catch(() => undefined);

    // 3. Restore old MEBBIS columns
    await queryRunner.query(`ALTER TABLE \`driving_school_students\`
      ADD COLUMN \`donem\` varchar(255) NULL,
      ADD COLUMN \`donem_text\` varchar(255) NULL,
      ADD COLUMN \`license_class\` varchar(255) NULL,
      ADD COLUMN \`mebbis_status\` varchar(255) NULL,
      ADD COLUMN \`approval_status\` varchar(255) NULL,
      ADD COLUMN \`ilce_mem_approval\` varchar(255) NULL,
      ADD COLUMN \`exam_date\` varchar(255) NULL,
      ADD COLUMN \`criminal_record_check\` varchar(255) NULL,
      ADD COLUMN \`practice_lessons\` varchar(255) NULL,
      ADD COLUMN \`practice_rights\` varchar(255) NULL,
      ADD COLUMN \`eexam_rights\` varchar(255) NULL,
      ADD COLUMN \`last_synced_at\` int unsigned NULL
    `);

    // 2. Backfill (best-effort) from new tables back into the old shape
    await queryRunner.query(`
      UPDATE \`driving_school_students\` s
      JOIN \`driving_school_student_mebbis\` m ON m.student_id = s.id
      SET s.donem = m.donem,
          s.license_class = m.istenen_sertifika,
          s.mebbis_status = m.durum,
          s.approval_status = m.kurum_onay,
          s.ilce_mem_approval = m.ilce_onay,
          s.practice_rights = CAST(m.uygulama_hak AS CHAR),
          s.eexam_rights = CAST(m.esinav_hak AS CHAR),
          s.last_synced_at = m.last_detail_seen_at
    `);

    // 1. Drop new tables
    await queryRunner.query(`DROP TABLE IF EXISTS \`driving_school_student_mebbis_lessons\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`driving_school_student_mebbis_exams\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`driving_school_student_mebbis\``);
  }
}
