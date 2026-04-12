import { Injectable, Logger } from '@nestjs/common';
import { CandidatesListService } from './mebbis/candidates-list.service';
import { AuthService } from './auth.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly authService: AuthService) {}

  async syncCandidates(tbMebbisId: number) {
    // Get cookie from database so MEBBIS requests are authenticated
    const cookie = await this.authService.getCookie(tbMebbisId);

    if (!cookie) {
      this.logger.error(`No cookie found for driving school ${tbMebbisId}`);
      return {
        data: {},
        error: { message: 'No session cookie found. Please login to MEBBIS first.' },
        message: 'candidate failed',
      };
    }

    this.logger.log(`Cookie found for school ${tbMebbisId} (length: ${cookie.length})`);

    const candidatesListService = new CandidatesListService(tbMebbisId, cookie);
    const r = await candidatesListService.getCandidates();

    if (r.success) {
      return r.data;
    } else {
      // Check if session expired
      if (r.data === 'SESSION_EXPIRED') {
        this.logger.warn(`Session expired for school ${tbMebbisId} - invalidating cookie`);
        await this.authService.invalidateCookie(tbMebbisId);
        return {
          data: {},
          error: { message: 'SESSION_EXPIRED', code: 'SESSION_EXPIRED' },
          message: 'candidate failed',
        };
      }
      return {
        data: {},
        error: { message: r.data },
        message: 'candidate failed',
      };
    }
  }
}
