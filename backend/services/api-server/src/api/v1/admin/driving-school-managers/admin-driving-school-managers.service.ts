import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DrivingSchoolManagerEntity, DrivingSchoolEntity } from '@surucukursu/shared';
import { CreateManagerDto, UpdateManagerDto } from './dto';
import { TextEncryptor } from '@surucukursu/shared';

@Injectable()
export class AdminDrivingSchoolManagersService {
    constructor(
      @InjectRepository(DrivingSchoolManagerEntity)
      private readonly managerRepository: Repository<DrivingSchoolManagerEntity>,
      @InjectRepository(DrivingSchoolEntity)
      private readonly schoolRepository: Repository<DrivingSchoolEntity>,
    ) { }

    async getAllManagers() {
        return this.managerRepository.find({
            relations: ['schools'],
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                created_at: true,
                updated_at: true,
                schools: {
                    id: true,
                    name: true
                }
            }
        });
    }

    async getManagerById(id: number) {
        const manager = await this.managerRepository.findOne({
            where: { id },
            relations: ['schools']
        });

        if (!manager) {
            throw new NotFoundException(`Manager with ID ${id} not found`);
        }

        return manager;
    }

    async createManager(dto: CreateManagerDto) {
        // Check if email is already in use
        const existingManager = await this.managerRepository.findOne({
            where: { email: dto.email }
        });

        if (existingManager) {
            throw new ConflictException(`Email ${dto.email} is already in use`);
        }

        const manager = this.managerRepository.create({
            name: dto.name,
            email: dto.email,
            password: TextEncryptor.userPasswordEncrypt(dto.password),
            phone: dto.phone
        });

        return this.managerRepository.save(manager);
    }

    async updateManager(id: number, dto: UpdateManagerDto) {
        // Check if manager exists
        const manager = await this.managerRepository.findOne({
            where: { id }
        });

        if (!manager) {
            throw new NotFoundException(`Manager with ID ${id} not found`);
        }

        // Check if email is already in use by another manager
        if (dto.email && dto.email !== manager.email) {
            const existingManager = await this.managerRepository.findOne({
                where: { email: dto.email }
            });

            if (existingManager) {
                throw new ConflictException(`Email ${dto.email} is already in use`);
            }
        }

        // Prepare update data
        const updateData: any = {};
        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.email !== undefined) updateData.email = dto.email;
        if (dto.phone !== undefined) updateData.phone = dto.phone;

        // Only encrypt password if it's provided
        if (dto.password) {
            updateData.password = TextEncryptor.userPasswordEncrypt(dto.password);
        }

        await this.managerRepository.update(id, updateData);

        return this.managerRepository.findOne({ where: { id } });
    }

    async deleteManager(id: number) {
        // Check if manager exists
        const manager = await this.managerRepository.findOne({
            where: { id },
            relations: ['schools']
        });

        if (!manager) {
            throw new NotFoundException(`Manager with ID ${id} not found`);
        }

        // Check if manager is assigned to any schools
        if (manager.schools && manager.schools.length > 0) {
            throw new ConflictException(
                `Cannot delete manager as they are assigned to ${manager.schools.length} schools. Please reassign these schools first.`
            );
        }

        await this.managerRepository.delete(id);

        return { message: 'Manager deleted successfully' };
    }
}