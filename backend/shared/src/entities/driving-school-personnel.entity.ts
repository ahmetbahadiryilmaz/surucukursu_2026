import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolPersonnelLinkEntity } from './driving-school-personnel-link.entity';
import { DrivingSchoolPersonnelProgramEntity } from './driving-school-personnel-program.entity';

/**
 * MEBBIS personnel (usta öğretici / personel). Global by TC: same person
 * scraped from multiple schools collapses into one row. Per-school context
 * (who scraped, when last seen, etc.) lives in driving_school_personnel_links.
 *
 * Fields mirror the local desktop PersonnelRecord shape — populated from
 * ook12001 (list) and ook12002 (detail).
 */
@Entity('driving_school_personnel')
export class DrivingSchoolPersonnelEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 11 })
  tc: string;

  /** Display name (combined). From skt04002 directly or `${ad} ${soyad}` from OOK. */
  @Column({ nullable: true }) ad_soyad: string;

  // ── SKT module (skt04002) ────────────────────────────────────────
  @Column({ nullable: true }) izin_no: string;
  @Column({ nullable: true }) durum: string;

  // ── OOK list (ook12001 / dgPersonelArama) ────────────────────────
  @Column({ nullable: true }) ad: string;
  @Column({ nullable: true }) soyad: string;
  @Column({ nullable: true }) statusu: string;
  @Column({ nullable: true }) gorevi: string;
  @Column({ nullable: true }) bransi: string;
  @Column({ nullable: true }) il: string;
  @Column({ nullable: true }) ilce: string;
  @Column({ nullable: true }) kurum_kodu: string;
  @Column({ nullable: true, type: 'varchar', length: 500 }) kurum_adi: string;
  @Column({ nullable: true, type: 'varchar', length: 500 }) kurum_adi_baslangic: string;
  @Column({ nullable: true }) calisma_izni_bas: string;
  @Column({ nullable: true }) calisma_izni_bit: string;
  @Column({ nullable: true }) ayrilma_tarihi: string;
  @Column({ nullable: true }) maas_kds: string;
  @Column({ nullable: true }) ucret_kds: string;
  @Column({ nullable: true }) durumu: string;

  // ── OOK detail (ook12002) ────────────────────────────────────────
  @Column({ nullable: true }) dogum_tarihi: string;
  @Column({ nullable: true }) ogrenim_bilgisi: string;
  @Column({ nullable: true }) mezuniyet_belge_cinsi: string;
  @Column({ nullable: true }) mezuniyet_tarihi: string;
  @Column({ nullable: true }) mezuniyet_belge_tarihi: string;
  @Column({ nullable: true }) mezuniyet_belge_sayisi: string;
  @Column({ nullable: true, type: 'varchar', length: 1000 }) mezuniyet_aciklama: string;
  @Column({ nullable: true }) brans1: string;
  @Column({ nullable: true }) brans2: string;
  @Column({ nullable: true }) brans3: string;
  @Column({ nullable: true }) brans4: string;
  @Column({ nullable: true }) ders_ucret: string;
  @Column({ nullable: true }) net_brut_ucret: string;
  @Column({ nullable: true }) e_posta: string;
  @Column({ nullable: true }) tel: string;
  @Column({ nullable: true }) maas_karsiligi_ders_sayisi: string;
  @Column({ nullable: true }) ders_ucreti_karsiligi_ders_sayisi: string;
  @Column({ nullable: true, type: 'varchar', length: 1000 }) ayrilma_aciklama: string;

  /** True once any detail scrape (ook12002) has populated detail-only fields. */
  @Column({ type: 'tinyint', default: 0 }) has_detail: boolean;

  /** Epoch seconds — most recent ook12002 detail scrape across all schools. */
  @Column({ type: 'int', unsigned: true, nullable: true }) last_detail_seen_at: number;

  @OneToMany(() => DrivingSchoolPersonnelLinkEntity, link => link.personnel)
  links: DrivingSchoolPersonnelLinkEntity[];

  @OneToMany(() => DrivingSchoolPersonnelProgramEntity, p => p.personnel)
  programs: DrivingSchoolPersonnelProgramEntity[];
}
