import { Injectable, BadRequestException, Logger, HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DrivingSchoolCarEntity, DrivingSchoolEntity, CarType, TextEncryptor } from '@surucukursu/shared';
import { MebbisClientService } from '../../../../common/clients/mebbis-client.service';

@Injectable()
export class CarsService {
    private readonly logger = new Logger(CarsService.name);
    
    constructor(
      @InjectRepository(DrivingSchoolCarEntity)
      private readonly carRepository: Repository<DrivingSchoolCarEntity>,
      @InjectRepository(DrivingSchoolEntity)
      private readonly schoolRepository: Repository<DrivingSchoolEntity>,
      private readonly mebbisClientService: MebbisClientService,
    ) {}

    /**
     * Parse Turkish date format DD/MM/YYYY to Date object
     */
    private parseTurkishDate(dateStr: string | undefined | null): Date | null {
        if (!dateStr || dateStr.trim() === '') return null;
        const parts = dateStr.trim().split('/');
        if (parts.length !== 3) return null;
        const [day, month, year] = parts.map(Number);
        if (!day || !month || !year) return null;
        return new Date(year, month - 1, day);
    }

    async getCars(code: string) {
        const cars = await this.carRepository.find({
            where: { school_id: parseInt(code) }
        });

        if (!cars.length) {
             //return empty array if no cars found
            return [];
        }

        return cars;
    }

    /**
     * Fetch vehicles and simulators from MEBBIS and upsert to database
     */
    async syncCars(code: string, ajandasKodu?: string) {
        const schoolId = parseInt(code);
        this.logger.log(`🔄 Starting car sync for school ID: ${schoolId}`);
        
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

            // Step 1: Sync vehicles using mebbis-service
            // mebbis-service handles: credential validation, session management, error handling
            this.logger.log('🚗 Step 1: Syncing vehicles from MEBBIS service...');
            const vehiclesData = await this.mebbisClientService.syncVehicles(
                schoolId,
                decryptedUsername,
                decryptedPassword,
                ajandasKodu
            );
            this.logger.log(`✅ Fetched ${vehiclesData.vehicles.length} vehicles and ${vehiclesData.simulators.length} simulators`);

            // Step 2: Parse and upsert vehicles to database
            this.logger.log('💾 Step 2: Upserting vehicles to database...');
            const upsertedVehicles = await this.upsertVehicles(schoolId, vehiclesData.vehicles, CarType.REGULAR_CAR);
            this.logger.log(`✅ Upserted ${upsertedVehicles} vehicles`);

            // Step 3: Parse and upsert simulators to database
            this.logger.log('💾 Step 3: Upserting simulators to database...');
            const upsertedSimulators = await this.upsertVehicles(schoolId, vehiclesData.simulators, CarType.SIMULATOR);
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
        } catch (error) {
            this.logger.error(`❌ Error syncing cars:`, error);
            
            // If it's an HttpException (from MebbisClientService), re-throw it as-is
            // It already has the proper error code and message
            if (error instanceof HttpException) {
              throw error;
            }
            
            // Fallback for unexpected errors
            throw new BadRequestException(
                error instanceof Error ? error.message : 'Senkronize sırasında bir hata oluştu'
            );
        }
    }

    /**
     * Upsert vehicles/simulators data from MEBBIS to database
     */
    private async upsertVehicles(
        schoolId: number,
        vehicles: Array<Record<string, string>>,
        carType: CarType
    ): Promise<number> {
        const carsToSave: DrivingSchoolCarEntity[] = [];

        for (const vehicle of vehicles) {
            // Map MEBBIS fields to database fields
            const car = new DrivingSchoolCarEntity();
            car.school_id = schoolId;
            car.car_type = carType;

            // Regular car specific fields
            if (carType === CarType.REGULAR_CAR) {
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

            // Simulator specific fields
            if (carType === CarType.SIMULATOR) {
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

        // Use QueryBuilder for upsert (INSERT ... ON DUPLICATE KEY UPDATE)
        if (carsToSave.length > 0) {
            const result = await this.carRepository
                .createQueryBuilder()
                .insert()
                .into(DrivingSchoolCarEntity)
                .values(carsToSave)
                .orUpdate(
                    [
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
                    ],
                    ['school_id', 'plate_number']
                )
                .execute();

            return result.identifiers.length || carsToSave.length;
        }

        return 0;
    }
}