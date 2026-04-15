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
var CarsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const shared_1 = require("../../../../../../../shared/src");
const mebbis_client_service_1 = require("../../../../common/clients/mebbis-client.service");
let CarsService = CarsService_1 = class CarsService {
    constructor(carRepository, schoolRepository, mebbisClientService) {
        this.carRepository = carRepository;
        this.schoolRepository = schoolRepository;
        this.mebbisClientService = mebbisClientService;
        this.logger = new common_1.Logger(CarsService_1.name);
    }
    parseTurkishDate(dateStr) {
        if (!dateStr || dateStr.trim() === '')
            return null;
        const parts = dateStr.trim().split('/');
        if (parts.length !== 3)
            return null;
        const [day, month, year] = parts.map(Number);
        if (!day || !month || !year)
            return null;
        return new Date(year, month - 1, day);
    }
    async getCars(code) {
        const cars = await this.carRepository.find({
            where: { school_id: parseInt(code) }
        });
        if (!cars.length) {
            return [];
        }
        return cars;
    }
    async syncCars(code, ajandasKodu) {
        const schoolId = parseInt(code);
        this.logger.log(`🔄 Starting car sync for school ID: ${schoolId}`);
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
            this.logger.log('🚗 Step 1: Syncing vehicles from MEBBIS service...');
            const vehiclesData = await this.mebbisClientService.syncVehicles(schoolId, decryptedUsername, decryptedPassword, ajandasKodu);
            this.logger.log(`✅ Fetched ${vehiclesData.vehicles.length} vehicles and ${vehiclesData.simulators.length} simulators`);
            this.logger.log('💾 Step 2: Upserting vehicles to database...');
            const upsertedVehicles = await this.upsertVehicles(schoolId, vehiclesData.vehicles, shared_1.CarType.REGULAR_CAR);
            this.logger.log(`✅ Upserted ${upsertedVehicles} vehicles`);
            this.logger.log('💾 Step 3: Upserting simulators to database...');
            const upsertedSimulators = await this.upsertVehicles(schoolId, vehiclesData.simulators, shared_1.CarType.SIMULATOR);
            this.logger.log(`✅ Upserted ${upsertedSimulators} simulators`);
            const totalSynced = upsertedVehicles + upsertedSimulators;
            this.logger.log(`✅ Car sync completed for school: ${school.name}. Total synced: ${totalSynced}`);
            return {
                success: true,
                message: 'Araçlar başarıyla senkronize edildi',
                syncedCount: totalSynced,
                vehicleCount: upsertedVehicles,
                simulatorCount: upsertedSimulators,
            };
        }
        catch (error) {
            this.logger.error(`❌ Error syncing cars:`, error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.BadRequestException(error instanceof Error ? error.message : 'Senkronize sırasında bir hata oluştu');
        }
    }
    async upsertVehicles(schoolId, vehicles, carType) {
        const carsToSave = [];
        for (const vehicle of vehicles) {
            const car = new shared_1.DrivingSchoolCarEntity();
            car.school_id = schoolId;
            car.car_type = carType;
            if (carType === shared_1.CarType.REGULAR_CAR) {
                car.model = vehicle['Modeli'] || vehicle['Model'] || vehicle['model'] || '';
                car.brand = vehicle['Markası'] || vehicle['Marka'] || vehicle['brand'] || '';
                car.plate_number = vehicle['Aracın Plakası'] || vehicle['Plaka'] || vehicle['plate_number'] || null;
                car.year = vehicle['Model Yılı'] ? parseInt(vehicle['Model Yılı']) : null;
                car.status = vehicle['Aracın Durumu'] || vehicle['Durum'] || null;
                car.purchase_date = this.parseTurkishDate(vehicle['Hizmete Giriş Tarihi'] || vehicle['Satın Alma Tarihi'] || vehicle['Alım Tarihi']);
                car.last_inspection_date = this.parseTurkishDate(vehicle['Son Muayene Tarihi']);
                car.inspection_validity_date = this.parseTurkishDate(vehicle['Muayene Geçerlilik Tarihi']);
                car.driver_count = vehicle['Sürücü Sayısı'] || vehicle['Şoför Adedi'] ? parseInt(vehicle['Sürücü Sayısı'] || vehicle['Şoför Adedi']) : null;
                car.lesson_count = vehicle['Ders Sayısı'] || vehicle['Ders Adedi'] ? parseInt(vehicle['Ders Sayısı'] || vehicle['Ders Adedi']) : null;
                car.excuse_days = vehicle['Özür Günü'] || vehicle['Mazeretli Gün'] ? parseInt(vehicle['Özür Günü'] || vehicle['Mazeretli Gün']) : null;
            }
            if (carType === shared_1.CarType.SIMULATOR) {
                car.model = 'Simülatör';
                car.brand = 'SIMULATOR';
                car.serial_number = vehicle['Seri Numarası'] || vehicle['Seri No'] || null;
                car.plate_number = vehicle['Seri Numarası'] || vehicle['Seri No'] || null;
                car.status = vehicle['Cihaz Durumu'] || vehicle['Durum'] || null;
                car.start_date = this.parseTurkishDate(vehicle['Alınma Tarihi'] || vehicle['Başlangıç Tarihi']);
                car.last_maintenance_date = this.parseTurkishDate(vehicle['Son Bakım Tarihi']);
                car.usage_hours = vehicle['Kullanım Saati'] ? parseInt(vehicle['Kullanım Saati']) : null;
                car.license_validity_date = this.parseTurkishDate(vehicle['Lisans Geçerlilik']);
            }
            carsToSave.push(car);
        }
        if (carsToSave.length > 0) {
            const result = await this.carRepository
                .createQueryBuilder()
                .insert()
                .into(shared_1.DrivingSchoolCarEntity)
                .values(carsToSave)
                .orUpdate([
                'model',
                'brand',
                'year',
                'car_type',
                'purchase_date',
                'last_inspection_date',
                'inspection_validity_date',
                'driver_count',
                'lesson_count',
                'excuse_days',
                'serial_number',
                'start_date',
                'last_maintenance_date',
                'usage_hours',
                'license_validity_date',
                'status',
                'updated_at'
            ], ['school_id', 'plate_number'])
                .execute();
            return result.identifiers.length || carsToSave.length;
        }
        return 0;
    }
};
exports.CarsService = CarsService;
exports.CarsService = CarsService = CarsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(shared_1.DrivingSchoolCarEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(shared_1.DrivingSchoolEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        mebbis_client_service_1.MebbisClientService])
], CarsService);
//# sourceMappingURL=cars.service.js.map