import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SystemLogProcessTypes, UserTypes } from '../../../auth/dto/enum';

export class GetLogsQueryDto {
  @ApiProperty({
    description: 'Page number (starts from 1)',
    example: 1,
    required: false,
    default: 1
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    required: false,
    default: 10,
    maximum: 100
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({
    description: 'Filter by user ID',
    example: 1,
    required: false
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  userId?: number;

  @ApiProperty({
    description: 'Filter by user type',
    enum: UserTypes,
    example: UserTypes.ADMIN,
    required: false
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  userType?: UserTypes;

  @ApiProperty({
    description: 'Filter by process type',
    enum: SystemLogProcessTypes,
    example: SystemLogProcessTypes.LOGIN,
    required: false
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  process?: SystemLogProcessTypes;
}

export class LogResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  user_id: number;

  @ApiProperty({
    enum: UserTypes
  })
  user_type: UserTypes;

  @ApiProperty({
    enum: SystemLogProcessTypes
  })
  process: SystemLogProcessTypes;

  @ApiProperty()
  admin_id: number | null;

  @ApiProperty()
  description: string;

  @ApiProperty()
  created_at: Date;
}

export class PaginatedLogsResponseDto {
  @ApiProperty({
    type: [LogResponseDto]
  })
  data: LogResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}