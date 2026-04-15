"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var StudentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const shared_1 = require("../../../../../../../shared/src");
const mebbis_client_service_1 = require("../../../../common/clients/mebbis-client.service");
let StudentsService = StudentsService_1 = class StudentsService {
    constructor(studentRepository, schoolRepository, integrationInfoRepository, mebbisClientService) {
        this.studentRepository = studentRepository;
        this.schoolRepository = schoolRepository;
        this.integrationInfoRepository = integrationInfoRepository;
        this.mebbisClientService = mebbisClientService;
        this.logger = new common_1.Logger(StudentsService_1.name);
    }
    async getStudents(code) {
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
    async syncStudents(code, ajandasKodu) {
        const schoolId = parseInt(code);
        this.logger.log(`🔄 Starting student sync for school ID: ${schoolId}`);
        try {
            const school = await this.schoolRepository.findOne({
                where: { id: schoolId }
            });
            if (!school) {
                throw new common_1.BadRequestException('Sürücü kursu bulunamadı');
            }
            if (!school.mebbis_username || !school.mebbis_password) {
                throw new common_1.BadRequestException('MEBBIS kimlik bilgileri bulunamadı. Lütfen önce kimlik bilgilerini kaydedin.');
            }
            const decryptedUsername = shared_1.TextEncryptor.mebbisUsernameDecrypt(school.mebbis_username);
            const decryptedPassword = shared_1.TextEncryptor.mebbisPasswordDecrypt(school.mebbis_password);
            this.logger.log(`📚 Found school: ${school.name}`);
            this.logger.log(`🔐 Using MEBBIS credentials for user: ${decryptedUsername}`);
            this.logger.log('👥 Step 1: Syncing students from MEBBIS service...');
            const studentsData = await this.mebbisClientService.syncStudents(schoolId, decryptedUsername, decryptedPassword);
            this.logger.log(`✅ Fetched ${studentsData.students.length} students`);
            this.logger.log('💾 Step 2: Upserting students to database...');
            const upsertedCount = await this.upsertStudents(schoolId, studentsData.students);
            this.logger.log(`✅ Upserted ${upsertedCount} students`);
            this.logger.log(`✅ Student sync completed for school: ${school.name}. Total synced: ${upsertedCount}`);
            return {
                success: true,
                message: 'Öğrenciler başarıyla senkronize edildi',
                syncedCount: upsertedCount,
            };
        }
        catch (error) {
            this.logger.error(`❌ Error syncing students:`, error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.BadRequestException(error instanceof Error ? error.message : 'Senkronize sırasında bir hata oluştu');
        }
    }
    async upsertStudents(schoolId, students) {
        const studentsToSave = [];
        const integrationDataMap = new Map();
        const now = Math.floor(Date.now() / 1000);
        for (const candidate of students) {
            const student = new shared_1.DrivingSchoolStudentEntity();
            student.school_id = schoolId;
            const tcNumber = candidate['tc_kimlik_no'] || candidate['tckimlikno'] || candidate['tc'] || candidate['tc_number'];
            if (!tcNumber || tcNumber.trim() === '') {
                this.logger.warn(`⚠️ Skipping student without TC number: ${JSON.stringify(candidate).substring(0, 200)}`);
                continue;
            }
            student.tc_number = tcNumber.trim();
            student.name = candidate['adi_soyadi'] || candidate['adi'] || candidate['name'] || '';
            student.email = candidate['e_posta'] || candidate['email'] || null;
            student.phone = candidate['telefon'] || candidate['tel'] || candidate['phone'] || null;
            student.donem = candidate['donem'] || null;
            student.donem_text = candidate['donemText'] || candidate['donem_text'] || null;
            student.license_class = candidate['mevcutistenen_surucu_belgesi_sinifi'] || candidate['donemi'] || null;
            student.mebbis_status = candidate['status'] || null;
            student.approval_status = candidate['kurum_onay_durumu'] || null;
            student.ilce_mem_approval = candidate['ilce_mem_onay_durumu'] || null;
            student.exam_date = candidate['sinav_tarihi'] || null;
            student.criminal_record_check = candidate['bakanlik_adli_sicil_sorgulamasi'] || null;
            student.practice_lessons = candidate['uygulama_ders'] || null;
            student.practice_rights = candidate['uygulama_hak'] || null;
            student.eexam_rights = candidate['esinav_hak'] || candidate['e_sinav_hak'] || null;
            student.last_synced_at = now;
            studentsToSave.push(student);
            integrationDataMap.set(student.tc_number, candidate);
        }
        if (studentsToSave.length > 0) {
            const result = await this.studentRepository
                .createQueryBuilder()
                .insert()
                .into(shared_1.DrivingSchoolStudentEntity)
                .values(studentsToSave)
                .orUpdate([
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
            ], ['tc_number'])
                .execute();
            this.logger.log(`✅ Upserted ${studentsToSave.length} students to driving_school_students`);
            await this.upsertIntegrationInfo(integrationDataMap);
            return result.identifiers.length || studentsToSave.length;
        }
        return 0;
    }
    async upsertIntegrationInfo(integrationDataMap) {
        try {
            const tcNumbers = Array.from(integrationDataMap.keys());
            if (tcNumbers.length === 0)
                return;
            const students = await this.studentRepository
                .createQueryBuilder('s')
                .select(['s.id', 's.tc_number'])
                .where('s.tc_number IN (:...tcNumbers)', { tcNumbers })
                .getMany();
            const integrationInfos = [];
            for (const student of students) {
                const rawData = integrationDataMap.get(student.tc_number);
                if (!rawData)
                    continue;
                const info = new shared_1.DrivingSchoolStudentIntegrationInfoEntity();
                info.student_id = student.id;
                info.external_id = student.tc_number;
                info.integration_data = JSON.stringify(rawData);
                integrationInfos.push(info);
            }
            if (integrationInfos.length > 0) {
                await this.integrationInfoRepository
                    .createQueryBuilder()
                    .insert()
                    .into(shared_1.DrivingSchoolStudentIntegrationInfoEntity)
                    .values(integrationInfos)
                    .orUpdate(['integration_data', 'external_id', 'updated_at'], ['student_id'])
                    .execute();
                this.logger.log(`✅ Upserted ${integrationInfos.length} integration info records`);
            }
        }
        catch (error) {
            this.logger.error('⚠️ Error upserting integration info (non-fatal):', error.message);
        }
    }
};
exports.StudentsService = StudentsService;
exports.StudentsService = StudentsService = StudentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(shared_1.DrivingSchoolStudentEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(shared_1.DrivingSchoolEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(shared_1.DrivingSchoolStudentIntegrationInfoEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        mebbis_client_service_1.MebbisClientService])
], StudentsService);
//# sourceMappingURL=students.service.js.map