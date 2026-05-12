import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  DrivingSchoolEntity,
  DrivingSchoolKurumInfoEntity,
  DrivingSchoolKurumProgramEntity,
  DrivingSchoolKurumVehicleEntity,
} from '@surucukursu/shared';

enum UserTypes {
  SUPER_ADMIN = -1,
  ADMIN = -2,
  DRIVING_SCHOOL_OWNER = 2,
  DRIVING_SCHOOL_MANAGER = 3,
}

export interface KurumProgramRow {
  ehliyetSinifi?: string;
  ruhsatTarihi?: string;
  kapanmaTarihi?: string;
  durum?: string;
}

export interface KurumVehicleRow {
  plaka?: string;
  ehliyetSinifi?: string;
  marka?: string;
  model?: string;
  modelYili?: string;
  tescilTarihi?: string;
  hizmeteGiris?: string;
  hizmettenCikis?: string;
  durum?: string;
  memOnay?: string;
}

export interface KurumInfoIngestPayload {
  kurumKodu?: string;
  kurumAdi?: string;
  kurumTelefon?: string;
  binaKontenjan?: string;
  kurumAdres?: string;
  acilmaTarihi?: string;
  programs?: KurumProgramRow[];
  vehicles?: KurumVehicleRow[];
}

@Injectable()
export class KurumInfoStoreService {
  constructor(
    @InjectRepository(DrivingSchoolEntity)
    private schoolRepository: Repository<DrivingSchoolEntity>,
    @InjectRepository(DrivingSchoolKurumInfoEntity)
    private infoRepository: Repository<DrivingSchoolKurumInfoEntity>,
    @InjectRepository(DrivingSchoolKurumProgramEntity)
    private programRepository: Repository<DrivingSchoolKurumProgramEntity>,
    @InjectRepository(DrivingSchoolKurumVehicleEntity)
    private vehicleRepository: Repository<DrivingSchoolKurumVehicleEntity>,
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

  async getKurumInfo(user: { id: number; userType: UserTypes }) {
    const schoolId = await this.resolveSchoolId(user);
    const info = await this.infoRepository.findOne({
      where: { school_id: schoolId },
      relations: ['programs', 'vehicles'],
    });
    return info || null;
  }

  async ingestKurumInfo(
    user: { id: number; userType: UserTypes },
    mebbisAccountId: string,
    payload: KurumInfoIngestPayload,
  ): Promise<{ kurum_info_id: number; programs: number; vehicles: number }> {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('payload required');
    }
    const schoolId = await this.resolveSchoolId(user);
    const now = Math.floor(Date.now() / 1000);

    return this.dataSource.transaction(async (mgr) => {
      const infoRepo = mgr.getRepository(DrivingSchoolKurumInfoEntity);
      const programRepo = mgr.getRepository(DrivingSchoolKurumProgramEntity);
      const vehicleRepo = mgr.getRepository(DrivingSchoolKurumVehicleEntity);

      let info = await infoRepo.findOne({ where: { school_id: schoolId } });
      if (!info) {
        info = infoRepo.create({ school_id: schoolId });
      }
      if (mebbisAccountId) info.mebbis_account_id = mebbisAccountId;
      if (payload.kurumKodu !== undefined) info.kurum_kodu = payload.kurumKodu;
      if (payload.kurumAdi !== undefined) info.kurum_adi = payload.kurumAdi;
      if (payload.kurumTelefon !== undefined) info.kurum_telefon = payload.kurumTelefon;
      if (payload.binaKontenjan !== undefined) info.bina_kontenjan = payload.binaKontenjan;
      if (payload.kurumAdres !== undefined) info.kurum_adres = payload.kurumAdres;
      if (payload.acilmaTarihi !== undefined) info.acilma_tarihi = payload.acilmaTarihi;
      info.last_scraped_at = now;
      info = await infoRepo.save(info);

      let programCount = 0;
      if (Array.isArray(payload.programs)) {
        await programRepo.delete({ kurum_info_id: info.id });
        if (payload.programs.length) {
          const rows = payload.programs.map((p) =>
            programRepo.create({
              kurum_info_id: info!.id,
              ehliyet_sinifi: p.ehliyetSinifi || null,
              ruhsat_tarihi: p.ruhsatTarihi || null,
              kapanma_tarihi: p.kapanmaTarihi || null,
              durum: p.durum || null,
            } as DrivingSchoolKurumProgramEntity),
          );
          await programRepo.save(rows);
          programCount = rows.length;
        }
      }

      let vehicleCount = 0;
      if (Array.isArray(payload.vehicles)) {
        await vehicleRepo.delete({ kurum_info_id: info.id });
        if (payload.vehicles.length) {
          const rows = payload.vehicles.map((v) =>
            vehicleRepo.create({
              kurum_info_id: info!.id,
              plaka: v.plaka || null,
              ehliyet_sinifi: v.ehliyetSinifi || null,
              marka: v.marka || null,
              model: v.model || null,
              model_yili: v.modelYili || null,
              tescil_tarihi: v.tescilTarihi || null,
              hizmete_giris: v.hizmeteGiris || null,
              hizmetten_cikis: v.hizmettenCikis || null,
              durum: v.durum || null,
              mem_onay: v.memOnay || null,
            } as DrivingSchoolKurumVehicleEntity),
          );
          await vehicleRepo.save(rows);
          vehicleCount = rows.length;
        }
      }

      return { kurum_info_id: info.id, programs: programCount, vehicles: vehicleCount };
    });
  }
}
