import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobEntity, DrivingSchoolCarEntity, SyncCarsStage, JobStatus } from '@surucukursu/shared';
import { SocketService } from './socket.service';
import { MebbisClientService } from '../clients/mebbis-client.service';

interface SyncCarJobMessage {
  jobId: number;
  schoolId: number;
  mebbisUsername: string;
  mebbisPassword: string;
}

@Injectable()
export class CarSyncService {
  private readonly logger = new Logger(CarSyncService.name);

  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
    @InjectRepository(DrivingSchoolCarEntity)
    private readonly carRepository: Repository<DrivingSchoolCarEntity>,
    private readonly socketService: SocketService,
    private readonly mebbisClientService: MebbisClientService,
  ) {}

  async processSync(message: SyncCarJobMessage): Promise<void> {
    const { jobId, schoolId, mebbisUsername, mebbisPassword } = message;

    try {
      this.logger.log(`🚗 Starting sync for job ${jobId}, school ${schoolId}`);

      // Update job: WAITING
      await this.updateJobStage(jobId, SyncCarsStage.WAITING);
      this.socketService.emit('job_progress', { jobId, stage: SyncCarsStage.WAITING, progress: 10 });

      // Update job: AUTHENTICATING
      await this.updateJobStage(jobId, SyncCarsStage.AUTHENTICATING);
      this.socketService.emit('job_progress', { jobId, stage: SyncCarsStage.AUTHENTICATING, progress: 20 });
      this.logger.log(`🔐 Authenticating with MEBBIS...`);

      // Update job: CONNECTING
      await this.updateJobStage(jobId, SyncCarsStage.CONNECTING);
      this.socketService.emit('job_progress', { jobId, stage: SyncCarsStage.CONNECTING, progress: 30 });
      this.logger.log(`🔗 Connecting to MEBBIS...`);

      // Update job: DOWNLOADING_VEHICLES
      await this.updateJobStage(jobId, SyncCarsStage.DOWNLOADING_VEHICLES);
      this.socketService.emit('job_progress', { jobId, stage: SyncCarsStage.DOWNLOADING_VEHICLES, progress: 40 });
      this.logger.log(`📥 Downloading vehicles...`);

      // Fetch vehicles and simulators from MEBBIS service
      const response = await this.mebbisClientService.fetchVehiclesAndSimulators(mebbisUsername, mebbisPassword);

      // Update job: DOWNLOADING_SIMULATORS
      await this.updateJobStage(jobId, SyncCarsStage.DOWNLOADING_SIMULATORS);
      this.socketService.emit('job_progress', { jobId, stage: SyncCarsStage.DOWNLOADING_SIMULATORS, progress: 60 });
      this.logger.log(`📥 Downloaded ${response.vehicles.length} vehicles, ${response.simulators.length} simulators`);

      // Update job: PROCESSING
      await this.updateJobStage(jobId, SyncCarsStage.PROCESSING);
      this.socketService.emit('job_progress', { jobId, stage: SyncCarsStage.PROCESSING, progress: 70 });
      this.logger.log(`⚙️  Processing data...`);

      // Map vehicles to entities and save
      const cars = response.vehicles.map((vehicle: any) => ({
        school_id: schoolId,
        plate_number: vehicle.Plaka,
        model: vehicle.Model,
        brand: vehicle.Marka,
        year: this.extractYear(vehicle['Satın Alma Tarihi']),
        purchase_date: this.parseDate(vehicle['Satın Alma Tarihi']),
        last_inspection_date: this.parseDate(vehicle['Son Muayene Tarihi']),
        inspection_validity_date: this.parseDate(vehicle['Muayene Geçerlilik Tarihi']),
        driver_count: parseInt(vehicle['Sürücü Sayısı'] || 0),
        lesson_count: parseInt(vehicle['Ders Sayısı'] || 0),
        status: vehicle.Durum,
      }));

      // Update job: SAVING
      await this.updateJobStage(jobId, SyncCarsStage.SAVING);
      this.socketService.emit('job_progress', { jobId, stage: SyncCarsStage.SAVING, progress: 80 });
      this.logger.log(`💾 Saving ${cars.length} cars to database...`);

      // Delete old cars and save new ones
      await this.carRepository.delete({ school_id: schoolId });
      await this.carRepository.save(cars);

      // Update job: COMPLETED
      await this.updateJobStage(jobId, SyncCarsStage.COMPLETED);
      await this.jobRepository.update(jobId, {
        status: JobStatus.COMPLETED,
        progress_percentage: 100,
      });

      this.socketService.emit('job_progress', {
        jobId,
        stage: SyncCarsStage.COMPLETED,
        progress: 100,
        syncedCount: cars.length,
      });

      this.logger.log(`✅ Sync completed for job ${jobId}. ${cars.length} cars synced.`);
    } catch (error) {
      this.logger.error(`❌ Error processing sync:`, error);
      await this.jobRepository.update(jobId, {
        status: JobStatus.FAILED,
        error_message: error instanceof Error ? error.message : 'Unknown error occurred',
      });

      this.socketService.emit('job_error', {
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async updateJobStage(jobId: number, stage: SyncCarsStage): Promise<void> {
    await this.jobRepository.update(jobId, {
      sync_stage: stage,
    });
  }

  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    try {
      return new Date(dateStr);
    } catch {
      return null;
    }
  }

  private extractYear(dateStr: string): number | null {
    if (!dateStr) return null;
    const match = dateStr.match(/\d{4}/);
    return match ? parseInt(match[0]) : null;
  }
}
