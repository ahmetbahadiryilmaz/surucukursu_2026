import { Controller, Post, Body } from '@nestjs/common';
import { CandidatesListService } from '../mebbis/candidates-list.service';

@Controller('api/mebbis/sync')
export class SyncController {
  @Post('candidates')
  async candidates(@Body() body: { tbMebbisId: number }) {
    const { tbMebbisId } = body;
    const cookieName = 'mebbis' + tbMebbisId + '.txt';
    const candidatesListService = new CandidatesListService(cookieName);
    const r = await candidatesListService.getCandidates(cookieName);
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
