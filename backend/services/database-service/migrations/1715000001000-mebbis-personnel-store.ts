import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds MEBBIS personnel storage.
 *
 *   driving_school_personnel          — global, keyed by TC
 *   driving_school_personnel_links    — (school, personnel) m:n with last-seen timestamps
 *   driving_school_personnel_programs — ook12002 "Derse Gireceği Programlar" rows
 *
 * Mirrors the local desktop personnel-db.ts shape.
 */
export class MebbisPersonnelStore1715000001000 implements MigrationInterface {
  name = 'MebbisPersonnelStore1715000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`driving_school_personnel\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`created_at\` int unsigned NULL,
        \`updated_at\` int unsigned NULL,
        \`deleted_at\` int unsigned NULL,
        \`tc\` varchar(11) NOT NULL,
        \`ad_soyad\` varchar(255) NULL,
        \`izin_no\` varchar(255) NULL,
        \`durum\` varchar(255) NULL,
        \`ad\` varchar(255) NULL,
        \`soyad\` varchar(255) NULL,
        \`statusu\` varchar(255) NULL,
        \`gorevi\` varchar(255) NULL,
        \`bransi\` varchar(255) NULL,
        \`il\` varchar(255) NULL,
        \`ilce\` varchar(255) NULL,
        \`kurum_kodu\` varchar(255) NULL,
        \`kurum_adi\` varchar(500) NULL,
        \`kurum_adi_baslangic\` varchar(500) NULL,
        \`calisma_izni_bas\` varchar(255) NULL,
        \`calisma_izni_bit\` varchar(255) NULL,
        \`ayrilma_tarihi\` varchar(255) NULL,
        \`maas_kds\` varchar(255) NULL,
        \`ucret_kds\` varchar(255) NULL,
        \`durumu\` varchar(255) NULL,
        \`dogum_tarihi\` varchar(255) NULL,
        \`ogrenim_bilgisi\` varchar(255) NULL,
        \`mezuniyet_belge_cinsi\` varchar(255) NULL,
        \`mezuniyet_tarihi\` varchar(255) NULL,
        \`mezuniyet_belge_tarihi\` varchar(255) NULL,
        \`mezuniyet_belge_sayisi\` varchar(255) NULL,
        \`mezuniyet_aciklama\` varchar(1000) NULL,
        \`brans1\` varchar(255) NULL,
        \`brans2\` varchar(255) NULL,
        \`brans3\` varchar(255) NULL,
        \`brans4\` varchar(255) NULL,
        \`ders_ucret\` varchar(255) NULL,
        \`net_brut_ucret\` varchar(255) NULL,
        \`e_posta\` varchar(255) NULL,
        \`tel\` varchar(255) NULL,
        \`maas_karsiligi_ders_sayisi\` varchar(255) NULL,
        \`ders_ucreti_karsiligi_ders_sayisi\` varchar(255) NULL,
        \`ayrilma_aciklama\` varchar(1000) NULL,
        \`has_detail\` tinyint NOT NULL DEFAULT 0,
        \`last_detail_seen_at\` int unsigned NULL,
        UNIQUE KEY \`uk_dsp_tc\` (\`tc\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`driving_school_personnel_links\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`created_at\` int unsigned NULL,
        \`updated_at\` int unsigned NULL,
        \`deleted_at\` int unsigned NULL,
        \`school_id\` int NOT NULL,
        \`personnel_id\` int NOT NULL,
        \`mebbis_account_id\` varchar(255) NULL,
        \`last_list_seen_at\` int unsigned NULL,
        \`last_detail_seen_at\` int unsigned NULL,
        UNIQUE KEY \`uk_dspl_school_personnel\` (\`school_id\`, \`personnel_id\`),
        KEY \`idx_dspl_personnel\` (\`personnel_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_dspl_school\` FOREIGN KEY (\`school_id\`)
          REFERENCES \`driving_schools\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_dspl_personnel\` FOREIGN KEY (\`personnel_id\`)
          REFERENCES \`driving_school_personnel\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`driving_school_personnel_programs\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`created_at\` int unsigned NULL,
        \`updated_at\` int unsigned NULL,
        \`deleted_at\` int unsigned NULL,
        \`personnel_id\` int NOT NULL,
        \`program\` varchar(500) NULL,
        \`tip\` varchar(255) NULL,
        KEY \`idx_dspp_personnel\` (\`personnel_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_dspp_personnel\` FOREIGN KEY (\`personnel_id\`)
          REFERENCES \`driving_school_personnel\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`driving_school_personnel_programs\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`driving_school_personnel_links\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`driving_school_personnel\``);
  }
}
