import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PdfService } from './pdf.service';
import { DrivingSchoolGuard } from '../../../../common/guards/driving-school.guard';
import { GenerateSinglePdfDto, PdfGenerationResponseDto } from '../main/dto/pdf.dto';
import {
    GenerateSingleSimulationDto,
    GenerateGroupSimulationDto,
    GenerateSingleDireksiyonTakipDto,
    GenerateGroupDireksiyonTakipDto,
    JobResponseDto
} from '../main/dto/simulation.dto';
import { JobType } from '@surucukursu/shared';

@ApiTags('PDF Generation')
@Controller('driving-school/:code/pdf')
@UseGuards(DrivingSchoolGuard)
@ApiBearerAuth()
export class PdfController {
    constructor(private readonly pdfService: PdfService) { }

    @Post('generate/single')
    @ApiOperation({ summary: 'Generate a single PDF certificate' })
    @ApiResponse({ status: 200, description: 'PDF generation queued successfully', type: PdfGenerationResponseDto })
    async generateSinglePdf(
        @Param('code') code: string,
        @Body() dto: GenerateSinglePdfDto
    ): Promise<PdfGenerationResponseDto> {
        return this.pdfService.queueSinglePdfGeneration(code, dto);
    }

    @Post('generate/group')
    @ApiOperation({ summary: 'Generate a group PDF certificates' })
    @ApiResponse({ status: 200, description: 'PDF generation queued successfully' })
    async generateGroupPdf(
        @Param('code') code: string,
        @Body() dto: { jobType: JobType; studentIds: number[]; template?: string; data?: any[] }
    ) {
        return this.pdfService.queueGroupPdfGeneration(code, dto);
    }

    @Post('simulation/single')
    @ApiOperation({ summary: 'Generate single simulation report' })
    @ApiResponse({ status: 200, description: 'Simulation job queued successfully', type: JobResponseDto })
    async generateSingleSimulation(
        @Param('code') code: string,
        @Body() dto: GenerateSingleSimulationDto
    ): Promise<JobResponseDto> {
        return this.pdfService.queueSingleSimulation(code, dto);
    }

    @Post('simulation/group')
    @ApiOperation({ summary: 'Generate group simulation reports' })
    @ApiResponse({ status: 200, description: 'Group simulation job queued successfully', type: JobResponseDto })
    async generateGroupSimulation(
        @Param('code') code: string,
        @Body() dto: GenerateGroupSimulationDto
    ): Promise<JobResponseDto> {
        return this.pdfService.queueGroupSimulation(code, dto);
    }

    @Post('direksiyon-takip/single')
    @ApiOperation({ summary: 'Generate single direksiyon takip report' })
    @ApiResponse({ status: 200, description: 'Direksiyon takip job queued successfully', type: JobResponseDto })
    async generateSingleDireksiyonTakip(
        @Param('code') code: string,
        @Body() dto: GenerateSingleDireksiyonTakipDto
    ): Promise<JobResponseDto> {
        return this.pdfService.queueSingleDireksiyonTakip(code, dto);
    }

    @Post('direksiyon-takip/group')
    @ApiOperation({ summary: 'Generate group direksiyon takip reports' })
    @ApiResponse({ status: 200, description: 'Group direksiyon takip job queued successfully', type: JobResponseDto })
    async generateGroupDireksiyonTakip(
        @Param('code') code: string,
        @Body() dto: GenerateGroupDireksiyonTakipDto
    ): Promise<JobResponseDto> {
        return this.pdfService.queueGroupDireksiyonTakip(code, dto);
    }

    @Post('progress')
    @ApiOperation({ summary: 'Handle PDF generation progress updates from workers' })
    @ApiResponse({ status: 200, description: 'Progress update processed successfully' })
    async handlePdfProgress(
        @Param('code') code: string,
        @Body() payload: {
            userId: number;
            tag: string;
            data: {
                jobId: string;
                progress: number;
                message: string;
                timestamp: string;
                pdfData?: string;
            };
        }
    ) {
        console.log('🎯 PDF Progress endpoint called with:', JSON.stringify(payload, null, 2));
        return this.pdfService.handlePdfProgressUpdate(payload);
    }
}