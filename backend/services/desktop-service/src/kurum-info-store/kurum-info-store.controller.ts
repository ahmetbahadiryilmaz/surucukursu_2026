import { Controller, Get, Post, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DesktopAuthGuard } from '../common/guards/desktop-auth.guard';
import { KurumInfoStoreService, KurumInfoIngestPayload } from './kurum-info-store.service';

@ApiTags('Desktop Kurum Info Store')
@Controller('kurum-info-store')
@UseGuards(DesktopAuthGuard)
@ApiBearerAuth()
export class KurumInfoStoreController {
  constructor(private readonly service: KurumInfoStoreService) {}

  @Get('info')
  @ApiOperation({ summary: 'Get cached kurum info for caller school' })
  @ApiResponse({ status: 200, description: 'Kurum info or null' })
  async getInfo(@Req() req: any) {
    return this.service.getKurumInfo(req.user);
  }

  @Post('info')
  @ApiOperation({ summary: 'Upsert kurum info + programs + vehicles from skt01001 scrape' })
  @ApiResponse({ status: 200, description: 'Ingest summary' })
  async ingest(
    @Req() req: any,
    @Body() body: { mebbis_account_id: string; payload: KurumInfoIngestPayload },
  ) {
    if (!body || !body.payload) {
      throw new BadRequestException('payload required');
    }
    return this.service.ingestKurumInfo(req.user, body.mebbis_account_id || '', body.payload);
  }
}
