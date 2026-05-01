import { Controller, Get, Post, Put, Delete, Req, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DrivingSchoolService } from './driving-school.service';
import { DesktopAuthGuard } from '../common/guards/desktop-auth.guard';

@ApiTags('Desktop Driving School')
@Controller('driving-school')
@UseGuards(DesktopAuthGuard)
@ApiBearerAuth()
export class DrivingSchoolController {
  constructor(private readonly drivingSchoolService: DrivingSchoolService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get authenticated driving school info + settings' })
  @ApiResponse({ status: 200, description: 'Driving school info returned' })
  @ApiResponse({ status: 404, description: 'Driving school not found' })
  async getMySchool(@Req() req: any) {
    return this.drivingSchoolService.getMySchool(req.user);
  }

  @Get('me/students')
  @ApiOperation({ summary: 'Get student list (id, name, tc_number) for driving school' })
  @ApiResponse({ status: 200, description: 'Student list returned' })
  @ApiResponse({ status: 404, description: 'Driving school not found' })
  async getMyStudents(@Req() req: any) {
    return this.drivingSchoolService.getMyStudents(req.user);
  }

  @Get('me/mebbis-accounts')
  @ApiOperation({ summary: 'List MEBBIS accounts (one per school) with credentials' })
  @ApiResponse({ status: 200, description: 'MEBBIS accounts returned' })
  async getMebbisAccounts(@Req() req: any) {
    return this.drivingSchoolService.getMebbisAccounts(req.user);
  }

  @Post('me/mebbis-accounts/:schoolId')
  @ApiOperation({ summary: 'Set (create/update) MEBBIS credentials for a school' })
  @ApiResponse({ status: 200, description: 'MEBBIS account updated' })
  @ApiResponse({ status: 404, description: 'School not found or access denied' })
  async upsertMebbisAccount(
    @Req() req: any,
    @Param('schoolId', ParseIntPipe) schoolId: number,
    @Body() body: { username: string; password: string; simulatorType?: string },
  ) {
    return this.drivingSchoolService.upsertMebbisAccount(req.user, schoolId, body);
  }

  @Delete('me/mebbis-accounts/:schoolId')
  @ApiOperation({ summary: 'Clear MEBBIS credentials for a school' })
  @ApiResponse({ status: 200, description: 'MEBBIS credentials cleared' })
  @ApiResponse({ status: 404, description: 'School not found or access denied' })
  async removeMebbisAccount(
    @Req() req: any,
    @Param('schoolId', ParseIntPipe) schoolId: number,
  ) {
    await this.drivingSchoolService.removeMebbisAccount(req.user, schoolId);
    return { success: true };
  }
}
