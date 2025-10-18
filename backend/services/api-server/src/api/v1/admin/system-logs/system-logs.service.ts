import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemLogsEntity } from '@surucukursu/shared';
import { GetLogsQueryDto, PaginatedLogsResponseDto } from './dto/get-logs.dto';

@Injectable()
export class SystemLogsService {
  constructor(
    @InjectRepository(SystemLogsEntity)
    private readonly systemLogsRepository: Repository<SystemLogsEntity>,
  ) {}

  async getLogs(query: GetLogsQueryDto): Promise<PaginatedLogsResponseDto> {
    const { page = 1, limit = 10, userId, userType, process } = query;
    // Convert page and limit to numbers to ensure they are not strings
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build the where condition
    const where: any = {
      deleted_at: null,
    };

    if (userId) {
      where.user_id = userId;
    }

    if (userType !== undefined) {
      // Convert string to number
      where.user_type = parseInt(userType.toString(), 10);
    }

    if (process !== undefined) {
      // Convert string to number
      where.process = parseInt(process.toString(), 10);
    }

    // Get total count
    const total = await this.systemLogsRepository.count({ where });

    // Get paginated logs
    const logs = await this.systemLogsRepository.find({
      where,
      skip,
      take: limitNum,
      order: {
        created_at: 'DESC',
      },
    });

    // Map logs to include admin_id and convert created_at to Date
    const mappedLogs = logs.map(log => ({
      ...log,
      created_at: new Date(log.created_at * 1000), // Convert timestamp to Date
      admin_id: log.user_type === 1 ? log.user_id : null, // Assuming 1 is admin type
    }));

    const totalPages = Math.ceil(total / limitNum);

    return {
      data: mappedLogs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    };
  }
}