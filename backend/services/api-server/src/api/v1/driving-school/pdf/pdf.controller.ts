import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PdfService } from './pdf.service';
import { DrivingSchoolGuard } from '../../../../common/guards/driving-school.guard';
import { GenerateSinglePdfDto, PdfGenerationResponseDto } from '../main/dto/pdf.dto';

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
        @Body() dto: { studentIds: number[]; template?: string; data?: any[] }
    ) {
        return this.pdfService.queueGroupPdfGeneration(code, dto);
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