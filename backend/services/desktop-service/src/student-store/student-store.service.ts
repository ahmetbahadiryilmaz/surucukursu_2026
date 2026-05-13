import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  DrivingSchoolEntity,
  DrivingSchoolStudentEntity,
  DrivingSchoolStudentSource,
  DrivingSchoolStudentMebbisEntity,
  DrivingSchoolStudentMebbisExamEntity,
  DrivingSchoolStudentMebbisLessonEntity,
  DrivingSchoolCarEntity,
  CarSource,
  CarType,
} from '@surucukursu/shared';

enum UserTypes {
  SUPER_ADMIN = -1,
  ADMIN = -2,
  DRIVING_SCHOOL_OWNER = 2,
  DRIVING_SCHOOL_MANAGER = 3,
}

export interface ListIngestRow {
  tc: string;
  adSoyad: string;
  donem?: string;
  grup?: string;
  sube?: string;
  durum?: string;
}

export interface DetailIngestPayload {
  tc: string;
  adSoyad: string;
  kurum?: string;
  donem?: string;
  grup?: string;
  sube?: string;
  mevcutBelge?: string;
  istenenSertifika?: string;
  kurumOnay?: string;
  ilceOnay?: string;
  uygulama?: string;
  durum?: string;
  teorikHak?: number;
  uygulamaHak?: number;
  esinavHak?: number;
  kayitUcreti?: number;
  exams: Array<{
    donem?: string;
    sinavKodu?: string;
    sinavTarihi?: string;
    plaka?: string;
    ustaOgretici?: string;
    onayDurumu?: string;
    sinavDurumu?: string;
    sonuc?: string;
  }>;
  lessons: Array<{
    donem?: string;
    grupAdi?: string;
    grupBaslama?: string;
    sube?: string;
    plaka?: string;
    dersYeri?: string;
    dersTarihi?: string;
    dersSaati?: string;
    personel?: string;
    egitimTuru?: string;
  }>;
}

@Injectable()
export class StudentStoreService {
  constructor(
    @InjectRepository(DrivingSchoolEntity)
    private schoolRepository: Repository<DrivingSchoolEntity>,
    @InjectRepository(DrivingSchoolStudentEntity)
    private studentRepository: Repository<DrivingSchoolStudentEntity>,
    @InjectRepository(DrivingSchoolStudentMebbisEntity)
    private mebbisRepository: Repository<DrivingSchoolStudentMebbisEntity>,
    @InjectRepository(DrivingSchoolStudentMebbisExamEntity)
    private examRepository: Repository<DrivingSchoolStudentMebbisExamEntity>,
    @InjectRepository(DrivingSchoolStudentMebbisLessonEntity)
    private lessonRepository: Repository<DrivingSchoolStudentMebbisLessonEntity>,
    @InjectRepository(DrivingSchoolCarEntity)
    private carRepository: Repository<DrivingSchoolCarEntity>,
    private dataSource: DataSource,
  ) {}

  /** Resolve the caller's school id from user context. Throws if none. */
  private async resolveSchoolId(user: { id: number; userType: UserTypes }): Promise<number> {
    const where =
      user.userType === UserTypes.DRIVING_SCHOOL_OWNER
        ? { owner_id: user.id }
        : { manager_id: user.id };
    const school = await this.schoolRepository.findOne({ where });
    if (!school) throw new NotFoundException('No driving school found for this account');
    return school.id;
  }

  /**
   * Compact student list for sidebar — joined with mebbis snapshot, no exam/lesson rows.
   * One row per student. Fast at any scale.
   */
  async listStudents(user: { id: number; userType: UserTypes }) {
    const schoolId = await this.resolveSchoolId(user);
    return this.studentRepository
      .createQueryBuilder('s')
      .leftJoin('s.mebbis', 'm')
      .where('s.school_id = :sid', { sid: schoolId })
      .select([
        's.id AS id',
        's.tc_number AS tc',
        's.name AS ad_soyad',
        's.source AS source',
        'm.has_detail AS has_detail',
        'm.donem AS donem',
        'm.grup AS grup',
        'm.sube AS sube',
        'm.durum AS durum',
        'm.last_list_seen_at AS last_list_seen_at',
        'm.last_detail_seen_at AS last_detail_seen_at',
      ])
      .getRawMany();
  }

  /** Full record incl. exams + lessons. Used by detail page. */
  async getStudent(user: { id: number; userType: UserTypes }, tc: string) {
    const schoolId = await this.resolveSchoolId(user);
    const student = await this.studentRepository.findOne({
      where: { school_id: schoolId, tc_number: tc },
      relations: ['mebbis', 'mebbis.exams', 'mebbis.lessons'],
    });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  /** Plates for the school (manual + scraped). */
  async listCars(user: { id: number; userType: UserTypes }) {
    const schoolId = await this.resolveSchoolId(user);
    return this.carRepository.find({
      where: { school_id: schoolId },
      select: ['id', 'plate_number', 'source', 'car_type', 'brand', 'model', 'route'],
    });
  }

  /** Save K-Belgesi güzergah for a car owned by this school. */
  async updateCarRoute(user: { id: number; userType: UserTypes }, carId: number, route: string) {
    const schoolId = await this.resolveSchoolId(user);
    const car = await this.carRepository.findOne({ where: { id: carId, school_id: schoolId } });
    if (!car) throw new Error(`Car ${carId} not found for school ${schoolId}`);
    car.route = route.trim();
    await this.carRepository.save(car);
    return { id: car.id, route: car.route };
  }

  /**
   * Bulk upsert from skt02006 list scrape.
   * - Creates student + empty mebbis row if not present (source = mebbis_scrape).
   * - Never demotes has_detail.
   */
  async ingestList(
    user: { id: number; userType: UserTypes },
    mebbisAccountId: string,
    rows: ListIngestRow[],
  ): Promise<{ created: number; updated: number }> {
    const schoolId = await this.resolveSchoolId(user);
    const now = Math.floor(Date.now() / 1000);
    let created = 0;
    let updated = 0;

    await this.dataSource.transaction(async (mgr) => {
      for (const row of rows) {
        if (!row.tc || !/^\d{11}$/.test(row.tc)) continue;
        const studentRepo = mgr.getRepository(DrivingSchoolStudentEntity);
        const mebbisRepo = mgr.getRepository(DrivingSchoolStudentMebbisEntity);

        // Upsert student row
        let student = await studentRepo.findOne({ where: { school_id: schoolId, tc_number: row.tc } });
        if (!student) {
          student = studentRepo.create({
            school_id: schoolId,
            tc_number: row.tc,
            name: row.adSoyad,
            source: DrivingSchoolStudentSource.MEBBIS_SCRAPE,
          });
          student = await studentRepo.save(student);
          created++;
        } else {
          if (row.adSoyad && student.name !== row.adSoyad) {
            student.name = row.adSoyad;
            await studentRepo.save(student);
          }
          updated++;
        }

        // Upsert mebbis snapshot — list fields only
        let mebbis = await mebbisRepo.findOne({ where: { student_id: student.id } });
        if (!mebbis) {
          mebbis = mebbisRepo.create({
            student_id: student.id,
            school_id: schoolId,
            mebbis_account_id: mebbisAccountId,
            has_detail: false,
          });
        }
        if (row.donem) mebbis.donem = row.donem;
        if (row.grup) mebbis.grup = row.grup;
        if (row.sube) mebbis.sube = row.sube;
        if (row.durum) mebbis.durum = row.durum;
        mebbis.last_list_seen_at = now;
        mebbis.mebbis_account_id = mebbisAccountId || mebbis.mebbis_account_id;
        await mebbisRepo.save(mebbis);
      }
    });

    return { created, updated };
  }

  /**
   * Full detail upsert from skt02009. Replaces exams + lessons (idempotent).
   * Also auto-discovers plates into driving_school_cars (source = mebbis_scrape).
   */
  async ingestDetail(
    user: { id: number; userType: UserTypes },
    mebbisAccountId: string,
    payload: DetailIngestPayload,
  ): Promise<{ studentIsNew: boolean; mebbis_id: number }> {
    const schoolId = await this.resolveSchoolId(user);
    const now = Math.floor(Date.now() / 1000);
    if (!payload.tc || !/^\d{11}$/.test(payload.tc)) {
      throw new NotFoundException('Invalid TC');
    }

    return this.dataSource.transaction(async (mgr) => {
      const studentRepo = mgr.getRepository(DrivingSchoolStudentEntity);
      const mebbisRepo = mgr.getRepository(DrivingSchoolStudentMebbisEntity);
      const examRepo = mgr.getRepository(DrivingSchoolStudentMebbisExamEntity);
      const lessonRepo = mgr.getRepository(DrivingSchoolStudentMebbisLessonEntity);
      const carRepo = mgr.getRepository(DrivingSchoolCarEntity);

      // Upsert student
      let student = await studentRepo.findOne({ where: { school_id: schoolId, tc_number: payload.tc } });
      let studentIsNew = false;
      if (!student) {
        student = studentRepo.create({
          school_id: schoolId,
          tc_number: payload.tc,
          name: payload.adSoyad,
          source: DrivingSchoolStudentSource.MEBBIS_SCRAPE,
        });
        student = await studentRepo.save(student);
        studentIsNew = true;
      } else if (payload.adSoyad && student.name !== payload.adSoyad) {
        student.name = payload.adSoyad;
        await studentRepo.save(student);
      }

      // Upsert mebbis snapshot — full detail
      let mebbis = await mebbisRepo.findOne({ where: { student_id: student.id } });
      if (!mebbis) {
        mebbis = mebbisRepo.create({
          student_id: student.id,
          school_id: schoolId,
          mebbis_account_id: mebbisAccountId,
        });
      }
      mebbis.has_detail = true;
      mebbis.last_detail_seen_at = now;
      mebbis.mebbis_account_id = mebbisAccountId || mebbis.mebbis_account_id;
      mebbis.kurum = payload.kurum ?? mebbis.kurum;
      if (payload.donem) mebbis.donem = payload.donem;
      if (payload.grup) mebbis.grup = payload.grup;
      if (payload.sube) mebbis.sube = payload.sube;
      mebbis.mevcut_belge = payload.mevcutBelge ?? mebbis.mevcut_belge;
      mebbis.istenen_sertifika = payload.istenenSertifika ?? mebbis.istenen_sertifika;
      mebbis.kurum_onay = payload.kurumOnay ?? mebbis.kurum_onay;
      mebbis.ilce_onay = payload.ilceOnay ?? mebbis.ilce_onay;
      mebbis.uygulama = payload.uygulama ?? mebbis.uygulama;
      if (payload.durum) mebbis.durum = payload.durum;
      mebbis.teorik_hak = payload.teorikHak ?? mebbis.teorik_hak;
      mebbis.uygulama_hak = payload.uygulamaHak ?? mebbis.uygulama_hak;
      mebbis.esinav_hak = payload.esinavHak ?? mebbis.esinav_hak;
      mebbis.kayit_ucreti = payload.kayitUcreti ?? mebbis.kayit_ucreti;
      mebbis = await mebbisRepo.save(mebbis);

      // Replace exams (idempotent — full delete + reinsert per detail visit)
      await examRepo.delete({ student_mebbis_id: mebbis.id });
      if (payload.exams.length) {
        await examRepo.save(
          payload.exams.map((e) =>
            examRepo.create({
              student_mebbis_id: mebbis!.id,
              school_id: schoolId,
              donem: e.donem,
              sinav_kodu: e.sinavKodu,
              sinav_tarihi: e.sinavTarihi,
              plaka: e.plaka,
              usta_ogretici: e.ustaOgretici,
              onay_durumu: e.onayDurumu,
              sinav_durumu: e.sinavDurumu,
              sonuc: e.sonuc,
            }),
          ),
        );
      }

      await lessonRepo.delete({ student_mebbis_id: mebbis.id });
      if (payload.lessons.length) {
        await lessonRepo.save(
          payload.lessons.map((l) =>
            lessonRepo.create({
              student_mebbis_id: mebbis!.id,
              school_id: schoolId,
              donem: l.donem,
              grup_adi: l.grupAdi,
              grup_baslama: l.grupBaslama,
              sube: l.sube,
              plaka: l.plaka,
              ders_yeri: l.dersYeri,
              ders_tarihi: l.dersTarihi,
              ders_saati: l.dersSaati,
              personel: l.personel,
              egitim_turu: l.egitimTuru,
            }),
          ),
        );
      }

      // Auto-discover plates into driving_school_cars
      const plates = Array.from(
        new Set(
          [
            ...payload.exams.map((e) => e.plaka),
            ...payload.lessons.map((l) => l.plaka),
          ].filter((p): p is string => !!p && p.trim().length > 0),
        ),
      );
      for (const plate of plates) {
        const exists = await carRepo.findOne({ where: { school_id: schoolId, plate_number: plate } });
        if (!exists) {
          await carRepo.save(
            carRepo.create({
              school_id: schoolId,
              plate_number: plate,
              source: CarSource.MEBBIS_SCRAPE,
              car_type: CarType.REGULAR_CAR,
            }),
          );
        }
      }

      return { studentIsNew, mebbis_id: mebbis.id };
    });
  }
}
