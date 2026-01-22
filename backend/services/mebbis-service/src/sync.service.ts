import { Injectable } from '@nestjs/common';
import { CandidatesListService } from './mebbis/candidates-list.service';

@Injectable()
export class SyncService {
  async syncCandidates(tbMebbisId: number) {
    const candidatesListService = new CandidatesListService(tbMebbisId);
    const r = await candidatesListService.getCandidates();

    if (r.success) {
      return r.data;
    } else {
      return {
        data: {},
        error: { message: r.data },
        message: 'candidate failed',
      };
    }
  }
}
