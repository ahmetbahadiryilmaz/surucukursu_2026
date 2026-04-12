import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DrivingSchoolStudentEntity, DrivingSchoolEntity, DrivingSchoolStudentIntegrationInfoEntity, TextEncryptor } from '@surucukursu/shared';
import { MebbisClientService } from '../../../../common/clients/mebbis-client.service';

@Injectable()
export class StudentsService {
    private readonly logger = new Logger(StudentsService.name);
    
    constructor(
      @InjectRepository(DrivingSchoolStudentEntity)
      private readonly studentRepository: Repository<DrivingSchoolStudentEntity>,
      @InjectRepository(DrivingSchoolEntity)
      private readonly schoolRepository: Repository<DrivingSchoolEntity>,
      @InjectRepository(DrivingSchoolStudentIntegrationInfoEntity)
      private readonly integrationInfoRepository: Repository<DrivingSchoolStudentIntegrationInfoEntity>,
      private readonly mebbisClientService: MebbisClientService,
    ) {}

    async getStudents(code: string) {
        const students = await this.studentRepository.find({
            where: { school_id: parseInt(code) },
            relations: ['school'],
            select: ['id', 'email', 'name', 'phone', 'school', 'created_at', 'updated_at']
        });

        if (!students.length) {
            return [];
        }

        return students;
    }

    /**
     * Sync students from MEBBIS and upsert to database
     */
    async syncStudents(code: string, ajandasKodu?: string) {
        const schoolId = parseInt(code);
        this.logger.log(`🔄 Starting student sync for school ID: ${schoolId}`);
        
        try {
            // Get driving school with credentials
            const school = await this.schoolRepository.findOne({
                where: { id: schoolId }
            });

            if (!school) {
                throw new BadRequestException('Sürücü kursu bulunamadı');
            }

            if (!school.mebbis_username || !school.mebbis_password) {
                throw new BadRequestException('MEBBIS kimlik bilgileri bulunamadı. Lütfen önce kimlik bilgilerini kaydedin.');
            }

            // Decrypt credentials before sending to mebbis-service
            const decryptedUsername = TextEncryptor.mebbisUsernameDecrypt(school.mebbis_username);
            const decryptedPassword = TextEncryptor.mebbisPasswordDecrypt(school.mebbis_password);

            this.logger.log(`📚 Found school: ${school.name}`);
            this.logger.log(`🔐 Using MEBBIS credentials for user: ${decryptedUsername}`);

            // Step 1: Sync students using mebbis-service
            this.logger.log('👥 Step 1: Syncing students from MEBBIS service...');
            const studentsData = await this.mebbisClientService.syncStudents(
                schoolId,
                decryptedUsername,
                decryptedPassword
            );
            this.logger.log(`✅ Fetched ${studentsData.students.length} students`);

            // Step 2: Parse and upsert students to database
            this.logger.log('💾 Step 2: Upserting students to database...');
            const upsertedCount = await this.upsertStudents(schoolId, studentsData.students);
            this.logger.log(`✅ Upserted ${upsertedCount} students`);

            this.logger.log(`✅ Student sync completed for school: ${school.name}. Total synced: ${upsertedCount}`);

            return {
                success: true,
                message: 'Öğrenciler başarıyla senkronize edildi',
                syncedCount: upsertedCount,
            };
        } catch (error) {
            this.logger.error(`❌ Error syncing students:`, error);
            throw new BadRequestException(
                error instanceof Error ? error.message : 'Senkronize sırasında bir hata oluştu'
            );
        }
    }

    /**
     * Upsert students data from MEBBIS to database
     * Column names come from CandidatesListService.processColumnNames() which:
     * - replaces spaces with _
     * - converts Turkish chars to ASCII (ı→i, ğ→g, ü→u, ş→s, ö→o, ç→c, İ→i)
     * - removes non-alphanumeric chars except _
     * - lowercases everything
     * 
     * Plus manually added fields: status, donem, donemText
     */
    private async upsertStudents(
        schoolId: number,
        students: Array<Record<string, string>>
    ): Promise<number> {
        const studentsToSave: DrivingSchoolStudentEntity[] = [];
        const integrationDataMap: Map<string, Record<string, string>> = new Map();
        const now = Math.floor(Date.now() / 1000);

        for (const candidate of students) {
            const student = new DrivingSchoolStudentEntity();
            student.school_id = schoolId;

            // TC number is the unique key for upsert
            // processColumnNames: "TC. Kimlik No" → "tc_kimlik_no"
            const tcNumber = candidate['tc_kimlik_no'] || candidate['tckimlikno'] || candidate['tc'] || candidate['tc_number'];
            if (!tcNumber || tcNumber.trim() === '') {
                this.logger.warn(`⚠️ Skipping student without TC number: ${JSON.stringify(candidate).substring(0, 200)}`);
                continue;
            }
            student.tc_number = tcNumber.trim();

            // processColumnNames: "Adı Soyadı" → "adi_soyadi"
            student.name = candidate['adi_soyadi'] || candidate['adi'] || candidate['name'] || '';

            // These fields are not in skt02006.aspx table but may come from other sources
            student.email = candidate['e_posta'] || candidate['email'] || null;
            student.phone = candidate['telefon'] || candidate['tel'] || candidate['phone'] || null;

            // MEBBIS sync fields
            // "donem" and "donemText" are manually added by CandidatesListService
            student.donem = candidate['donem'] || null;
            student.donem_text = candidate['donemText'] || candidate['donem_text'] || null;

            // processColumnNames: "Mevcut/İstenen Sürücü Belgesi Sınıfı" → "mevcutistenen_surucu_belgesi_sinifi"
            student.license_class = candidate['mevcutistenen_surucu_belgesi_sinifi'] || candidate['donemi'] || null;

            // "status" is manually added (0 = Kursa Başvuru, 2 = Uygulama Sınav)
            student.mebbis_status = candidate['status'] || null;

            // processColumnNames: "Kurum Onay Durumu" → "kurum_onay_durumu"
            student.approval_status = candidate['kurum_onay_durumu'] || null;

            // processColumnNames: "İlçe MEM Onay Durumu" → "ilce_mem_onay_durumu"
            student.ilce_mem_approval = candidate['ilce_mem_onay_durumu'] || null;

            // processColumnNames: "Sınav Tarihi" → "sinav_tarihi"
            student.exam_date = candidate['sinav_tarihi'] || null;

            // processColumnNames: "Bakanlık Adli Sicil Sorgulaması" → "bakanlik_adli_sicil_sorgulamasi"
            student.criminal_record_check = candidate['bakanlik_adli_sicil_sorgulamasi'] || null;

            // processColumnNames: "Uygulama Ders" → "uygulama_ders"
            student.practice_lessons = candidate['uygulama_ders'] || null;

            // processColumnNames: "Uygulama Hak" → "uygulama_hak"
            student.practice_rights = candidate['uygulama_hak'] || null;

            // processColumnNames: "E-Sınav Hak" → "e_sinav_hak"  (- is removed by regex)
            student.eexam_rights = candidate['esinav_hak'] || candidate['e_sinav_hak'] || null;

            student.last_synced_at = now;

            studentsToSave.push(student);

            // Store full raw data for integration info (including photos)
            integrationDataMap.set(student.tc_number, candidate);
        }

        // Use QueryBuilder for upsert (INSERT ... ON DUPLICATE KEY UPDATE)
        if (studentsToSave.length > 0) {
            const result = await this.studentRepository
                .createQueryBuilder()
                .insert()
                .into(DrivingSchoolStudentEntity)
                .values(studentsToSave)
                .orUpdate(
                    [
                        'name',
                        'email',
                        'phone',
                        'donem',
                        'donem_text',
                        'license_class',
                        'mebbis_status',
                        'approval_status',
                        'ilce_mem_approval',
                        'exam_date',
                        'criminal_record_check',
                        'practice_lessons',
                        'practice_rights',
                        'eexam_rights',
                        'last_synced_at',
                        'updated_at'
                    ],
                    ['tc_number']
                )
                .execute();

            this.logger.log(`✅ Upserted ${studentsToSave.length} students to driving_school_students`);

            // Now store integration info (full MEBBIS data) for each student
            await this.upsertIntegrationInfo(integrationDataMap);

            return result.identifiers.length || studentsToSave.length;
        }

        return 0;
    }

    /**
     * Upsert integration info for students (stores full MEBBIS raw data including photos)
     */
    private async upsertIntegrationInfo(
        integrationDataMap: Map<string, Record<string, string>>
    ): Promise<void> {
        try {
            // Get student IDs by their TC numbers
            const tcNumbers = Array.from(integrationDataMap.keys());
            if (tcNumbers.length === 0) return;

            const students = await this.studentRepository
                .createQueryBuilder('s')
                .select(['s.id', 's.tc_number'])
                .where('s.tc_number IN (:...tcNumbers)', { tcNumbers })
                .getMany();

            const integrationInfos: DrivingSchoolStudentIntegrationInfoEntity[] = [];

            for (const student of students) {
                const rawData = integrationDataMap.get(student.tc_number);
                if (!rawData) continue;

                const info = new DrivingSchoolStudentIntegrationInfoEntity();
                info.student_id = student.id;
                info.external_id = student.tc_number;
                info.integration_data = JSON.stringify(rawData);

                integrationInfos.push(info);
            }

            if (integrationInfos.length > 0) {
                await this.integrationInfoRepository
                    .createQueryBuilder()
                    .insert()
                    .into(DrivingSchoolStudentIntegrationInfoEntity)
                    .values(integrationInfos)
                    .orUpdate(
                        ['integration_data', 'external_id', 'updated_at'],
                        ['student_id']
                    )
                    .execute();

                this.logger.log(`✅ Upserted ${integrationInfos.length} integration info records`);
            }
        } catch (error) {
            this.logger.error('⚠️ Error upserting integration info (non-fatal):', error.message);
            // Non-fatal: student records are already saved, integration info is supplementary
        }
    }
}
