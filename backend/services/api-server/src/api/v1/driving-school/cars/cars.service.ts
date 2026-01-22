import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DrivingSchoolCarEntity, DrivingSchoolEntity } from '@surucukursu/shared';
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

    async getCars(code: string) {
        const cars = await this.carRepository.find({
            where: { school_id: parseInt(code) },
            select: ['id', 'model', 'plate_number', 'school_id', 'year']
        });

        if (!cars.length) {
             //return empty array if no cars found
            return [];
        }

        return cars;
    }

    async syncCars(code: string) {
        this.logger.log(`🔄 Starting car sync for school ID: ${code}`);
        
        try {
            // Get driving school with credentials
            const school = await this.schoolRepository.findOne({
                where: { id: parseInt(code) }
            });

            if (!school) {
                throw new BadRequestException('Sürücü kursu bulunamadı');
            }

            this.logger.log(`📚 Found school: ${school.name}`);

            // TODO: Fetch cars from MEBBIS service using school credentials
            // This is a placeholder - actual implementation will depend on MEBBIS service endpoints
            // const vehicles = await this.mebbisClientService.fetchVehicles(school.mebbis_username, school.mebbis_password);
            
            this.logger.log(`✅ Car sync completed for school: ${school.name}`);

            return {
                success: true,
                message: 'Araçlar başarıyla senkronize edildi',
                syncedCount: 0 // This will be updated when MEBBIS integration is complete
            };
        } catch (error) {
            this.logger.error(`❌ Error syncing cars:`, error);
            throw new BadRequestException(
                error instanceof Error ? error.message : 'Senkronize sırasında bir hata oluştu'
            );
        }
    }
}