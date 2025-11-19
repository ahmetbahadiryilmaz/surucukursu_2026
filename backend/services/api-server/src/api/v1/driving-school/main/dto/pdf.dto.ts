import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsObject, IsOptional, IsString, IsEnum } from 'class-validator';
import { JobType } from '@surucukursu/shared';

export class GenerateSinglePdfDto {
  @ApiProperty({ description: 'Job type', enum: JobType })
  @IsEnum(JobType)
  jobType: JobType;

  @ApiProperty({ description: 'Student ID' })
  @IsNumber()
  studentId: number;

  @ApiProperty({ description: 'Template name', default: 'certificate' })
  @IsString()
  @IsOptional()
  template?: string = 'certificate';

  @ApiProperty({ description: 'Additional data for the PDF template' })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}

export class PdfGenerationResponseDto {
  @ApiProperty({ description: 'Unique job ID for tracking' })
  jobId: string;

  @ApiProperty({ description: 'Message indicating the request was queued' })
  message: string;

  @ApiProperty({ description: 'Estimated processing time in seconds' })
  estimatedTime: number;
}