import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DrivingSchoolEntity, DrivingSchoolStudentEntity, DrivingSchoolCarEntity } from '@surucukursu/shared';
import { TextEncryptor } from '@surucukursu/shared';
import { UpdateDrivingSchoolCredsDto } from './dto/update-driving-school-creds.dto';
import { DrivingSchoolCredsDto } from './dto/driving-school-creds.dto';
import {
  DashboardStats,
  RecentActivity,
  DashboardData,
  DashboardResponse
} from '../../admin/dashboard';

@Injectable()
export class DrivingSchoolService {
    constructor(
      @InjectRepository(DrivingSchoolEntity)
      private readonly drivingSchoolRepository: Repository<DrivingSchoolEntity>,
    ) {}

    async getDrivingSchoolInfo(code: string) {
        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) },
            select: ['id', 'name', 'address', 'phone']
        });

        if (!drivingSchool) {
            throw new NotFoundException(`Driving school with code ${code} not found`);
        }

        return drivingSchool;
    }

    async getCreds(code: string): Promise<DrivingSchoolCredsDto> {
        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) },
            select: ['name', 'mebbis_username']
        });

        if (!drivingSchool) {
            throw new NotFoundException('Driving school not found');
        }

        return {
            name: drivingSchool.name,
            mebbis_username: TextEncryptor.mebbisUsernameDecrypt(drivingSchool.mebbis_username)
        };
    }

    async updateCreds(code: string, dto: UpdateDrivingSchoolCredsDto) {
        const school = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) }
        });

        if (!school) {
            throw new NotFoundException(`Driving school with code ${code} not found`);
        }

        const updateData: any = {};
        if (dto.mebbis_username) {
            updateData.mebbis_username = TextEncryptor.mebbisUsernameEncrypt(dto.mebbis_username);
        }
        if (dto.mebbis_password) {
            updateData.mebbis_password = TextEncryptor.mebbisPasswordEncrypt(dto.mebbis_password);
        }

        return this.drivingSchoolRepository.update(parseInt(code), updateData);
    }
}