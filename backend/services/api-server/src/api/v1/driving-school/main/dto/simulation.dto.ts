import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsArray, IsOptional, IsString } from 'class-validator';
import { SimulationType, JobType } from '@surucukursu/shared';

export class GenerateSingleSimulationDto {
  @ApiProperty({ description: 'Job type (must be SINGLE_SIMULATION)', enum: JobType })
  @IsEnum(JobType)
  jobType: JobType;

  @ApiProperty({ description: 'Student ID' })
  @IsNumber()
  studentId: number;

  @ApiProperty({ description: 'Simulation type', enum: SimulationType })
  @IsEnum(SimulationType)
  simulationType: SimulationType;

  @ApiProperty({ description: 'Template name', required: false })
  @IsString()
  @IsOptional()
  template?: string;
}

export class GenerateGroupSimulationDto {
  @ApiProperty({ description: 'Job type (must be GROUP_SIMULATION)', enum: JobType })
  @IsEnum(JobType)
  jobType: JobType;

  @ApiProperty({ description: 'Array of student IDs' })
  @IsArray()
  @IsNumber({}, { each: true })
  studentIds: number[];

  @ApiProperty({ description: 'Simulation type', enum: SimulationType })
  @IsEnum(SimulationType)
  simulationType: SimulationType;

  @ApiProperty({ description: 'Template name', required: false })
  @IsString()
  @IsOptional()
  template?: string;
}

export class GenerateSingleDireksiyonTakipDto {
  @ApiProperty({ description: 'Job type (must be SINGLE_DIREKSIYON_TAKIP)', enum: JobType })
  @IsEnum(JobType)
  jobType: JobType;

  @ApiProperty({ description: 'Student ID' })
  @IsNumber()
  studentId: number;

  @ApiProperty({ description: 'Template name', required: false })
  @IsString()
  @IsOptional()
  template?: string;
}

export class GenerateGroupDireksiyonTakipDto {
  @ApiProperty({ description: 'Job type (must be GROUP_DIREKSIYON_TAKIP)', enum: JobType })
  @IsEnum(JobType)
  jobType: JobType;

  @ApiProperty({ description: 'Array of student IDs' })
  @IsArray()
  @IsNumber({}, { each: true })
  studentIds: number[];

  @ApiProperty({ description: 'Template name', required: false })
  @IsString()
  @IsOptional()
  template?: string;
}

export class JobResponseDto {
  @ApiProperty({ description: 'Unique job ID for tracking' })
  jobId: string;

  @ApiProperty({ description: 'Job type' })
  jobType: string;

  @ApiProperty({ description: 'Message indicating the request was queued' })
  message: string;

  @ApiProperty({ description: 'Estimated processing time in seconds' })
  estimatedTime: number;
}
