import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({ example: 25, description: 'Total number of driving schools' })
  totalDrivingSchools: number;

  @ApiProperty({ example: 1250, description: 'Total number of students' })
  totalStudents: number;

  @ApiProperty({ example: 5, description: 'Total number of system administrators' })
  totalAdmins: number;

  @ApiProperty({ example: 45, description: 'Total number of driving school managers' })
  totalManagers: number;

  @ApiProperty({ example: 87, description: 'Number of currently active courses' })
  activeCourses: number;

  @ApiProperty({ example: 156, description: 'Number of completed exams this month' })
  completedExams: number;
}

export class RecentActivityDto {
  @ApiProperty({ example: 1, description: 'Activity ID' })
  id: number;

  @ApiProperty({ example: 'student', description: 'Type of activity (student, exam, etc.)' })
  type: string;

  @ApiProperty({ example: 'John Doe', description: 'User who performed the action' })
  user: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'ISO date when activity occurred' })
  date: string;

  @ApiProperty({ example: 'Student completed driving theory exam', description: 'Activity description' })
  description: string;
}

export class DashboardResponseDto {
  @ApiProperty({ type: DashboardStatsDto, description: 'Dashboard statistics' })
  stats: DashboardStatsDto;

  @ApiProperty({ type: [RecentActivityDto], description: 'List of recent activities' })
  recentActivities: RecentActivityDto[];

  @ApiProperty({ example: true, description: 'Request success status' })
  success: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Response timestamp' })
  timestamp: string;
}

export class SystemServiceDto {
  @ApiProperty({ example: 'Database', description: 'Service name' })
  name: string;

  @ApiProperty({ 
    example: 'RUNNING', 
    enum: ['RUNNING', 'DOWN', 'UNKNOWN'], 
    description: 'Service status' 
  })
  status: 'RUNNING' | 'DOWN' | 'UNKNOWN';
}

export class SystemCPUDto {
  @ApiProperty({ example: 45.2, description: 'CPU usage percentage' })
  usage: number;

  @ApiProperty({ example: 65, description: 'CPU temperature in Celsius', required: false })
  temperature?: number;
}

export class SystemMemoryDto {
  @ApiProperty({ example: 8589934592, description: 'Used memory in bytes' })
  used: number;

  @ApiProperty({ example: 17179869184, description: 'Total memory in bytes' })
  total: number;

  @ApiProperty({ example: 50.0, description: 'Memory usage percentage' })
  usage: number;
}

export class SystemDiskDto {
  @ApiProperty({ example: 214748364800, description: 'Used disk space in bytes' })
  used: number;

  @ApiProperty({ example: 1099511627776, description: 'Total disk space in bytes' })
  total: number;

  @ApiProperty({ example: 19.5, description: 'Disk usage percentage' })
  usage: number;
}

export class SystemInfoResponseDto {
  @ApiProperty({ type: SystemCPUDto, description: 'CPU information' })
  cpu: SystemCPUDto;

  @ApiProperty({ type: SystemMemoryDto, description: 'Memory information' })
  memory: SystemMemoryDto;

  @ApiProperty({ type: SystemDiskDto, description: 'Disk information' })
  disk: SystemDiskDto;

  @ApiProperty({ type: [SystemServiceDto], description: 'Services status' })
  services: SystemServiceDto[];

  @ApiProperty({ example: true, description: 'Request success status' })
  success: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Response timestamp' })
  timestamp: string;
}
