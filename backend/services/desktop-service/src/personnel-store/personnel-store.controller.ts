import { Controller, Get, Post, Param, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DesktopAuthGuard } from '../common/guards/desktop-auth.guard';
import {
  PersonnelStoreService,
  PersonnelListIngestRow,
  PersonnelDetailIngestPayload,
} from './personnel-store.service';

@ApiTags('Desktop Personnel Store')
@Controller('personnel-store')
@UseGuards(DesktopAuthGuard)
@ApiBearerAuth()
export class PersonnelStoreController {
  constructor(private readonly service: PersonnelStoreService) {}

  @Get('personnel')
  @ApiOperation({ summary: 'Compact personnel list linked to the caller school' })
  @ApiResponse({ status: 200, description: 'Personnel returned' })
  async listPersonnel(@Req() req: any) {
    return this.service.listPersonnel(req.user);
  }

  @Get('personnel/:tc')
  @ApiOperation({ summary: 'Full personnel record (only if linked to caller school)' })
  @ApiResponse({ status: 200, description: 'Personnel returned' })
  @ApiResponse({ status: 404, description: 'Not found or not linked' })
  async getPersonnel(@Req() req: any, @Param('tc') tc: string) {
    return this.service.getPersonnel(req.user, tc);
  }

  @Post('personnel/list')
  @ApiOperation({ summary: 'Bulk upsert personnel from ook12001 list scrape' })
  @ApiResponse({ status: 200, description: 'Ingest summary' })
  async ingestList(
    @Req() req: any,
    @Body() body: { mebbis_account_id: string; rows: PersonnelListIngestRow[] },
  ) {
    if (!body || !Array.isArray(body.rows)) {
      throw new BadRequestException('rows array required');
    }
    return this.service.ingestList(req.user, body.mebbis_account_id || '', body.rows);
  }

  @Post('personnel/detail')
  @ApiOperation({ summary: 'Upsert personnel detail from ook12002 scrape' })
  @ApiResponse({ status: 200, description: 'Ingest result' })
  async ingestDetail(
    @Req() req: any,
    @Body() body: { mebbis_account_id: string; payload: PersonnelDetailIngestPayload },
  ) {
    if (!body || !body.payload || !body.payload.tc) {
      throw new BadRequestException('payload with tc required');
    }
    return this.service.ingestDetail(req.user, body.mebbis_account_id || '', body.payload);
  }
}
