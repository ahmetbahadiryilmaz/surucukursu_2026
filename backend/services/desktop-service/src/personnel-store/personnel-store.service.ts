import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  DrivingSchoolEntity,
  DrivingSchoolPersonnelEntity,
  DrivingSchoolPersonnelLinkEntity,
  DrivingSchoolPersonnelProgramEntity,
} from '@surucukursu/shared';

enum UserTypes {
  SUPER_ADMIN = -1,
  ADMIN = -2,
  DRIVING_SCHOOL_OWNER = 2,
  DRIVING_SCHOOL_MANAGER = 3,
}

export interface PersonnelListIngestRow {
  tc: string;
  adSoyad?: string;
  izinNo?: string;
  durum?: string;
  ad?: string;
  soyad?: string;
  statusu?: string;
  gorevi?: string;
  bransi?: string;
  il?: string;
  ilce?: string;
  kurumKodu?: string;
  kurumAdi?: string;
  kurumAdiBaslangic?: string;
  calismaIzniBas?: string;
  calismaIzniBit?: string;
  ayrilmaTarihi?: string;
  maasKds?: string;
  ucretKds?: string;
  durumu?: string;
}

export interface PersonnelDetailIngestPayload {
  tc: string;
  dogumTarihi?: string;
  ogrenimBilgisi?: string;
  mezuniyetBelgeCinsi?: string;
  mezuniyetTarihi?: string;
  mezuniyetBelgeTarihi?: string;
  mezuniyetBelgeSayisi?: string;
  mezuniyetAciklama?: string;
  gorevi?: string;
  statusu?: string;
  bransi?: string;
  brans2?: string;
  brans3?: string;
  brans4?: string;
  dersUcret?: string;
  netBrutUcret?: string;
  calismaIzniBas?: string;
  calismaIzniBit?: string;
  maasKarsiligiDersSayisi?: string;
  dersUcretiKarsiligiDersSayisi?: string;
  durumu?: string;
  ayrilmaAciklama?: string;
  ePosta?: string;
  tel?: string;
  derseProgramlar?: Array<{ program: string; tip: string }>;
}

@Injectable()
export class PersonnelStoreService {
  constructor(
    @InjectRepository(DrivingSchoolEntity)
    private schoolRepository: Repository<DrivingSchoolEntity>,
    @InjectRepository(DrivingSchoolPersonnelEntity)
    private personnelRepository: Repository<DrivingSchoolPersonnelEntity>,
    @InjectRepository(DrivingSchoolPersonnelLinkEntity)
    private linkRepository: Repository<DrivingSchoolPersonnelLinkEntity>,
    @InjectRepository(DrivingSchoolPersonnelProgramEntity)
    private programRepository: Repository<DrivingSchoolPersonnelProgramEntity>,
    private dataSource: DataSource,
  ) {}

  private async resolveSchoolId(user: { id: number; userType: UserTypes }): Promise<number> {
    const where =
      user.userType === UserTypes.DRIVING_SCHOOL_OWNER
        ? { owner_id: user.id }
        : { manager_id: user.id };
    const school = await this.schoolRepository.findOne({ where });
    if (!school) throw new NotFoundException('No driving school found for this account');
    return school.id;
  }

  /** All personnel linked to the caller's school + selected snapshot fields. */
  async listPersonnel(user: { id: number; userType: UserTypes }) {
    const schoolId = await this.resolveSchoolId(user);
    return this.linkRepository
      .createQueryBuilder('link')
      .innerJoin('link.personnel', 'p')
      .where('link.school_id = :sid', { sid: schoolId })
      .select([
        'p.id AS id',
        'p.tc AS tc',
        'p.ad_soyad AS ad_soyad',
        'p.ad AS ad',
        'p.soyad AS soyad',
        'p.izin_no AS izin_no',
        'p.gorevi AS gorevi',
        'p.statusu AS statusu',
        'p.bransi AS bransi',
        'p.il AS il',
        'p.ilce AS ilce',
        'p.kurum_adi AS kurum_adi',
        'p.calisma_izni_bas AS calisma_izni_bas',
        'p.calisma_izni_bit AS calisma_izni_bit',
        'p.durumu AS durumu',
        'p.has_detail AS has_detail',
        'link.mebbis_account_id AS mebbis_account_id',
        'link.last_list_seen_at AS last_list_seen_at',
        'link.last_detail_seen_at AS last_detail_seen_at',
      ])
      .getRawMany();
  }

  /** Full personnel record (only if linked to caller's school). */
  async getPersonnel(user: { id: number; userType: UserTypes }, tc: string) {
    const schoolId = await this.resolveSchoolId(user);
    const personnel = await this.personnelRepository.findOne({
      where: { tc },
      relations: ['programs'],
    });
    if (!personnel) throw new NotFoundException('Personnel not found');
    const link = await this.linkRepository.findOne({ where: { school_id: schoolId, personnel_id: personnel.id } });
    if (!link) throw new NotFoundException('Personnel not linked to your school');
    return { ...personnel, link };
  }

  /**
   * Bulk upsert from ook12001 list scrape.
   * Global personnel row keyed by TC; school link upserted with last_list_seen_at.
   */
  async ingestList(
    user: { id: number; userType: UserTypes },
    mebbisAccountId: string,
    rows: PersonnelListIngestRow[],
  ): Promise<{ created: number; updated: number; linked: number }> {
    if (!Array.isArray(rows)) throw new BadRequestException('rows array required');
    const schoolId = await this.resolveSchoolId(user);
    const now = Math.floor(Date.now() / 1000);
    let created = 0;
    let updated = 0;
    let linked = 0;

    await this.dataSource.transaction(async (mgr) => {
      const personnelRepo = mgr.getRepository(DrivingSchoolPersonnelEntity);
      const linkRepo = mgr.getRepository(DrivingSchoolPersonnelLinkEntity);

      for (const row of rows) {
        if (!row.tc || !/^\d{11}$/.test(row.tc)) continue;
        const combined =
          row.adSoyad ||
          [row.ad, row.soyad].filter(Boolean).join(' ').trim() ||
          undefined;

        let person = await personnelRepo.findOne({ where: { tc: row.tc } });
        if (!person) {
          person = personnelRepo.create({ tc: row.tc, ad_soyad: combined || '' });
          this.applyListFields(person, row);
          person = await personnelRepo.save(person);
          created++;
        } else {
          if (combined) person.ad_soyad = combined;
          this.applyListFields(person, row);
          await personnelRepo.save(person);
          updated++;
        }

        let link = await linkRepo.findOne({ where: { school_id: schoolId, personnel_id: person.id } });
        if (!link) {
          link = linkRepo.create({
            school_id: schoolId,
            personnel_id: person.id,
            mebbis_account_id: mebbisAccountId || undefined,
            last_list_seen_at: now,
          });
          linked++;
        } else {
          link.last_list_seen_at = now;
          if (mebbisAccountId) link.mebbis_account_id = mebbisAccountId;
        }
        await linkRepo.save(link);
      }
    });

    return { created, updated, linked };
  }

  /** Detail upsert from ook12002. TC must already exist (list pass first). */
  async ingestDetail(
    user: { id: number; userType: UserTypes },
    mebbisAccountId: string,
    payload: PersonnelDetailIngestPayload,
  ): Promise<{ personnel_id: number }> {
    if (!payload?.tc || !/^\d{11}$/.test(payload.tc)) throw new BadRequestException('Invalid TC');
    const schoolId = await this.resolveSchoolId(user);
    const now = Math.floor(Date.now() / 1000);

    return this.dataSource.transaction(async (mgr) => {
      const personnelRepo = mgr.getRepository(DrivingSchoolPersonnelEntity);
      const linkRepo = mgr.getRepository(DrivingSchoolPersonnelLinkEntity);
      const programRepo = mgr.getRepository(DrivingSchoolPersonnelProgramEntity);

      let person = await personnelRepo.findOne({ where: { tc: payload.tc } });
      if (!person) {
        // Detail before list — create a stub so the row exists, then merge.
        person = personnelRepo.create({ tc: payload.tc, ad_soyad: '' });
        person = await personnelRepo.save(person);
      }

      this.applyDetailFields(person, payload);
      person.has_detail = true;
      person.last_detail_seen_at = now;
      person = await personnelRepo.save(person);

      let link = await linkRepo.findOne({ where: { school_id: schoolId, personnel_id: person.id } });
      if (!link) {
        link = linkRepo.create({
          school_id: schoolId,
          personnel_id: person.id,
          mebbis_account_id: mebbisAccountId || undefined,
        });
      }
      link.last_detail_seen_at = now;
      if (mebbisAccountId) link.mebbis_account_id = mebbisAccountId;
      await linkRepo.save(link);

      await programRepo.delete({ personnel_id: person.id });
      if (Array.isArray(payload.derseProgramlar) && payload.derseProgramlar.length) {
        await programRepo.save(
          payload.derseProgramlar.map((p) =>
            programRepo.create({
              personnel_id: person!.id,
              program: p.program,
              tip: p.tip,
            }),
          ),
        );
      }

      return { personnel_id: person.id };
    });
  }

  private applyListFields(p: DrivingSchoolPersonnelEntity, r: PersonnelListIngestRow) {
    const m: Array<[keyof PersonnelListIngestRow, keyof DrivingSchoolPersonnelEntity]> = [
      ['izinNo', 'izin_no'], ['durum', 'durum'],
      ['ad', 'ad'], ['soyad', 'soyad'],
      ['statusu', 'statusu'], ['gorevi', 'gorevi'], ['bransi', 'bransi'],
      ['il', 'il'], ['ilce', 'ilce'],
      ['kurumKodu', 'kurum_kodu'], ['kurumAdi', 'kurum_adi'], ['kurumAdiBaslangic', 'kurum_adi_baslangic'],
      ['calismaIzniBas', 'calisma_izni_bas'], ['calismaIzniBit', 'calisma_izni_bit'],
      ['ayrilmaTarihi', 'ayrilma_tarihi'],
      ['maasKds', 'maas_kds'], ['ucretKds', 'ucret_kds'],
      ['durumu', 'durumu'],
    ];
    for (const [src, dst] of m) {
      const v = r[src];
      if (v !== undefined && v !== '') (p as any)[dst] = v;
    }
  }

  private applyDetailFields(p: DrivingSchoolPersonnelEntity, d: PersonnelDetailIngestPayload) {
    const m: Array<[keyof PersonnelDetailIngestPayload, keyof DrivingSchoolPersonnelEntity]> = [
      ['dogumTarihi', 'dogum_tarihi'],
      ['ogrenimBilgisi', 'ogrenim_bilgisi'],
      ['mezuniyetBelgeCinsi', 'mezuniyet_belge_cinsi'],
      ['mezuniyetTarihi', 'mezuniyet_tarihi'],
      ['mezuniyetBelgeTarihi', 'mezuniyet_belge_tarihi'],
      ['mezuniyetBelgeSayisi', 'mezuniyet_belge_sayisi'],
      ['mezuniyetAciklama', 'mezuniyet_aciklama'],
      ['gorevi', 'gorevi'], ['statusu', 'statusu'], ['bransi', 'bransi'],
      ['brans2', 'brans2'], ['brans3', 'brans3'], ['brans4', 'brans4'],
      ['dersUcret', 'ders_ucret'], ['netBrutUcret', 'net_brut_ucret'],
      ['calismaIzniBas', 'calisma_izni_bas'], ['calismaIzniBit', 'calisma_izni_bit'],
      ['maasKarsiligiDersSayisi', 'maas_karsiligi_ders_sayisi'],
      ['dersUcretiKarsiligiDersSayisi', 'ders_ucreti_karsiligi_ders_sayisi'],
      ['durumu', 'durumu'], ['ayrilmaAciklama', 'ayrilma_aciklama'],
      ['ePosta', 'e_posta'], ['tel', 'tel'],
    ];
    for (const [src, dst] of m) {
      const v = d[src as keyof PersonnelDetailIngestPayload];
      if (v !== undefined && v !== '') (p as any)[dst] = v;
    }
  }
}
