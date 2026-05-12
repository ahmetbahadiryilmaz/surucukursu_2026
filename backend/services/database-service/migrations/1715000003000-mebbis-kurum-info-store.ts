import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * MEBBIS skt01001 (Kurum Bilgileri) snapshot per driving school.
 *
 *   driving_school_kurum_info     — header (Kurum Adı, Telefon, Adres, …)
 *   driving_school_kurum_programs — "Kurum Alt Programları" rows
 *   driving_school_kurum_vehicles — "Araç Bilgileri" rows
 *
 * Scoped per driving_schools.id; one info row per school (UNIQUE school_id).
 * Programs and vehicles are replaced wholesale on every scrape (idempotent).
 */
export class MebbisKurumInfoStore1715000003000 implements MigrationInterface {
  name = 'MebbisKurumInfoStore1715000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`driving_school_kurum_info\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`created_at\` int unsigned NULL,
        \`updated_at\` int unsigned NULL,
        \`deleted_at\` int unsigned NULL,
        \`school_id\` int NOT NULL,
        \`mebbis_account_id\` varchar(255) NULL,
        \`kurum_kodu\` varchar(255) NULL,
        \`kurum_adi\` varchar(500) NULL,
        \`kurum_telefon\` varchar(50) NULL,
        \`bina_kontenjan\` varchar(50) NULL,
        \`kurum_adres\` varchar(1000) NULL,
        \`acilma_tarihi\` varchar(50) NULL,
        \`last_scraped_at\` int unsigned NULL,
        UNIQUE KEY \`uk_dski_school\` (\`school_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_dski_school\` FOREIGN KEY (\`school_id\`)
          REFERENCES \`driving_schools\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`driving_school_kurum_programs\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`created_at\` int unsigned NULL,
        \`updated_at\` int unsigned NULL,
        \`deleted_at\` int unsigned NULL,
        \`kurum_info_id\` int NOT NULL,
        \`ehliyet_sinifi\` varchar(255) NULL,
        \`ruhsat_tarihi\` varchar(50) NULL,
        \`kapanma_tarihi\` varchar(50) NULL,
        \`durum\` varchar(50) NULL,
        KEY \`idx_dskp_info\` (\`kurum_info_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_dskp_info\` FOREIGN KEY (\`kurum_info_id\`)
          REFERENCES \`driving_school_kurum_info\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`driving_school_kurum_vehicles\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`created_at\` int unsigned NULL,
        \`updated_at\` int unsigned NULL,
        \`deleted_at\` int unsigned NULL,
        \`kurum_info_id\` int NOT NULL,
        \`plaka\` varchar(50) NULL,
        \`ehliyet_sinifi\` varchar(255) NULL,
        \`marka\` varchar(255) NULL,
        \`model\` varchar(500) NULL,
        \`model_yili\` varchar(10) NULL,
        \`tescil_tarihi\` varchar(50) NULL,
        \`hizmete_giris\` varchar(50) NULL,
        \`hizmetten_cikis\` varchar(50) NULL,
        \`durum\` varchar(50) NULL,
        \`mem_onay\` varchar(50) NULL,
        KEY \`idx_dskv_info\` (\`kurum_info_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_dskv_info\` FOREIGN KEY (\`kurum_info_id\`)
          REFERENCES \`driving_school_kurum_info\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`driving_school_kurum_vehicles\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`driving_school_kurum_programs\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`driving_school_kurum_info\``);
  }
}
