import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateDrivingSchoolSettingsDto {
  @ApiProperty({
    description: 'Simulator type (sesim or ana_grup)',
    example: 'sesim',
    required: false
  })
  @IsOptional()
  @IsString()
  simulator_type?: string;

  @ApiProperty({
    description: 'Enable student notifications',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  student_notifications?: boolean;

  @ApiProperty({
    description: 'Enable lesson reminders',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  lesson_reminders?: boolean;

  @ApiProperty({
    description: 'Enable exam alerts',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  exam_alerts?: boolean;

  @ApiProperty({
    description: 'Enable marketing emails',
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  marketing_emails?: boolean;

  @ApiProperty({
    description: 'Enable system updates',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  system_updates?: boolean;

  @ApiProperty({
    description: 'Enable auto scheduling',
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  auto_scheduling?: boolean;
}
