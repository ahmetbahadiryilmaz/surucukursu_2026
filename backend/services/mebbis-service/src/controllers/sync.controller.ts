import { Controller, Post, Body } from '@nestjs/common';
import { SyncService } from '../sync.service';

@Controller('api/mebbis/sync')
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post('candidates')
  async candidates(@Body() body: { tbMebbisId: number }) {
    const { tbMebbisId } = body;
    return this.syncService.syncCandidates(tbMebbisId);
  }
}
