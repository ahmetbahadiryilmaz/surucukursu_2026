import { ApiProperty } from '@nestjs/swagger';

export class DrivingSchoolSettingsDto {
  @ApiProperty({
    description: 'Simulator type (sesim or ana_grup)',
    example: 'sesim',
    required: false
  })
  simulator_type?: string;

  @ApiProperty({
    description: 'Enable student notifications',
    example: true
  })
  student_notifications: boolean;

  @ApiProperty({
    description: 'Enable lesson reminders',
    example: true
  })
  lesson_reminders: boolean;

  @ApiProperty({
    description: 'Enable exam alerts',
    example: true
  })
  exam_alerts: boolean;

  @ApiProperty({
    description: 'Enable marketing emails',
    example: false
  })
  marketing_emails: boolean;

  @ApiProperty({
    description: 'Enable system updates',
    example: true
  })
  system_updates: boolean;

  @ApiProperty({
    description: 'Enable auto scheduling',
    example: false
  })
  auto_scheduling: boolean;
}
