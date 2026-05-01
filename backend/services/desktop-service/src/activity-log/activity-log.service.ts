import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionEntity, SystemLogsEntity } from '@surucukursu/shared';

export type ActivityEvent = 'school_login' | 'pdf_download';
export type PdfType = 'direksiyon_takip' | 'simulator_raporu';

export interface ActivityLogDto {
  event: ActivityEvent;
  school_id: number;
  pdf_type?: PdfType;
  count?: number;
}

// Local constant — system_logs.process is int. 100 reserved for desktop activity.
const DESKTOP_ACTIVITY_PROCESS = 100;

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepository: Repository<SubscriptionEntity>,
    @InjectRepository(SystemLogsEntity)
    private readonly systemLogsRepository: Repository<SystemLogsEntity>,
  ) {}

  async record(
    user: { id: number; userType: number },
    body: ActivityLogDto,
  ): Promise<void> {
    // Best-effort: never throw to caller
    try {
      if (body.event === 'pdf_download') {
        const count = Math.max(1, Math.floor(body.count ?? 1));
        await this.subscriptionRepository.increment(
          { driving_school_id: body.school_id },
          'pdf_print_used',
          count,
        );
      }
    } catch (err) {
      this.logger.warn(`pdf_print_used increment failed: ${(err as Error).message}`);
    }

    try {
      await this.systemLogsRepository.save(
        this.systemLogsRepository.create({
          user_id: user.id,
          user_type: user.userType,
          process: DESKTOP_ACTIVITY_PROCESS,
          description: JSON.stringify(body),
        }),
      );
    } catch (err) {
      this.logger.warn(`system_logs save failed: ${(err as Error).message}`);
    }
  }
}
