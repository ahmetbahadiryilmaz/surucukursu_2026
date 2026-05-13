import { Controller, Get, Post, Patch, Param, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DesktopAuthGuard } from '../common/guards/desktop-auth.guard';
import {
  StudentStoreService,
  ListIngestRow,
  DetailIngestPayload,
} from './student-store.service';

@ApiTags('Desktop Student Store')
@Controller('student-store')
@UseGuards(DesktopAuthGuard)
@ApiBearerAuth()
export class StudentStoreController {
  constructor(private readonly service: StudentStoreService) {}

  @Get('students')
  @ApiOperation({ summary: 'Compact student list for the caller school (with MEBBIS snapshot, no exams/lessons)' })
  @ApiResponse({ status: 200, description: 'Students returned' })
  async listStudents(@Req() req: any) {
    return this.service.listStudents(req.user);
  }

  @Get('students/:tc')
  @ApiOperation({ summary: 'Full student record incl. exams + lessons' })
  @ApiResponse({ status: 200, description: 'Student returned' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getStudent(@Req() req: any, @Param('tc') tc: string) {
    return this.service.getStudent(req.user, tc);
  }

  @Get('cars')
  @ApiOperation({ summary: 'Plates for the caller school (manual + scraped)' })
  @ApiResponse({ status: 200, description: 'Cars returned' })
  async listCars(@Req() req: any) {
    return this.service.listCars(req.user);
  }

  @Patch('cars/:id/route')
  @ApiOperation({ summary: 'Save K-Belgesi güzergah for a car' })
  @ApiResponse({ status: 200, description: 'Route saved' })
  async updateCarRoute(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { route: string },
  ) {
    if (!body || typeof body.route !== 'string') throw new BadRequestException('route string required');
    return this.service.updateCarRoute(req.user, Number(id), body.route);
  }

  @Post('students/list')
  @ApiOperation({ summary: 'Bulk upsert basic student records from skt02006 list scrape' })
  @ApiResponse({ status: 200, description: 'Ingest summary' })
  async ingestList(
    @Req() req: any,
    @Body() body: { mebbis_account_id: string; rows: ListIngestRow[] },
  ) {
    if (!body || !Array.isArray(body.rows)) {
      throw new BadRequestException('rows array required');
    }
    return this.service.ingestList(req.user, body.mebbis_account_id || '', body.rows);
  }

  @Post('students/detail')
  @ApiOperation({ summary: 'Upsert full student detail from skt02009 scrape' })
  @ApiResponse({ status: 200, description: 'Ingest result' })
  async ingestDetail(
    @Req() req: any,
    @Body() body: { mebbis_account_id: string; payload: DetailIngestPayload },
  ) {
    if (!body || !body.payload || !body.payload.tc) {
      throw new BadRequestException('payload with tc required');
    }
    return this.service.ingestDetail(req.user, body.mebbis_account_id || '', body.payload);
  }
}
