import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DrivingSchoolOwnerEntity, DrivingSchoolEntity, DrivingSchoolManagerEntity } from '@surucukursu/shared';
import { CreateOwnerDto, UpdateOwnerDto } from './dto';
import { TextEncryptor } from '@surucukursu/shared';

@Injectable()
export class AdminDrivingSchoolOwnersService {
    constructor(
      @InjectRepository(DrivingSchoolOwnerEntity)
      private readonly ownerRepository: Repository<DrivingSchoolOwnerEntity>,
      @InjectRepository(DrivingSchoolEntity)
      private readonly schoolRepository: Repository<DrivingSchoolEntity>,
      @InjectRepository(DrivingSchoolManagerEntity)
      private readonly managerRepository: Repository<DrivingSchoolManagerEntity>,
    ) { }

    async getAllOwners() {
        return this.ownerRepository.find({
            relations: ['DrivingSchool'],
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                created_at: true,
                updated_at: true,
                DrivingSchool: {
                    id: true,
                    name: true
                }
            }
        });
    }

    async getOwnerById(id: number) {
        const owner = await this.ownerRepository.findOne({
            where: { id },
            relations: ['DrivingSchool']
        });

        if (!owner) {
            throw new NotFoundException(`Owner with ID ${id} not found`);
        }

        return owner;
    }

    async createOwner(dto: CreateOwnerDto) {
        // Check if email is already in use
        const existingOwner = await this.ownerRepository.findOne({
            where: { email: dto.email }
        });

        if (existingOwner) {
            throw new ConflictException(`Email ${dto.email} is already in use`);
        }

        // Create owner
        const owner = this.ownerRepository.create({
            name: dto.name,
            email: dto.email,
            password: TextEncryptor.userPasswordEncrypt(dto.password),
            phone: dto.phone
        });

        const savedOwner = await this.ownerRepository.save(owner);

        // Also create manager with same credentials
        const manager = this.managerRepository.create({
            name: dto.name,
            email: dto.email,
            password: TextEncryptor.userPasswordEncrypt(dto.password),
            phone: dto.phone
        });

        await this.managerRepository.save(manager);

        return savedOwner;
    }

    async updateOwner(id: number, dto: UpdateOwnerDto) {
        // Check if owner exists
        const owner = await this.ownerRepository.findOne({
            where: { id }
        });

        if (!owner) {
            throw new NotFoundException(`Owner with ID ${id} not found`);
        }

        // Check if email is already in use by another owner
        if (dto.email && dto.email !== owner.email) {
            const existingOwner = await this.ownerRepository.findOne({
                where: { email: dto.email }
            });

            if (existingOwner) {
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

        await this.ownerRepository.update(id, updateData);

        return this.ownerRepository.findOne({ where: { id } });
    }

    async deleteOwner(id: number) {
        // Check if owner exists
        const owner = await this.ownerRepository.findOne({
            where: { id },
            relations: ['DrivingSchool']
        });

        if (!owner) {
            throw new NotFoundException(`Owner with ID ${id} not found`);
        }

        // Check if owner is assigned to any schools
        if (owner.DrivingSchool && owner.DrivingSchool.length > 0) {
            throw new ConflictException(
                `Cannot delete owner as they are assigned to ${owner.DrivingSchool.length} schools. Please reassign these schools first.`
            );
        }

        await this.ownerRepository.delete(id);

        return { message: 'Owner deleted successfully' };
    }
}