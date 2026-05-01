import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminEntity } from '@surucukursu/shared';
import { CreateAdminDto, UpdateAdminDto } from './dto';
import { TextEncryptor } from '@surucukursu/shared';

@Injectable()
export class AdminsService {
  constructor(
    @InjectRepository(AdminEntity)
    private readonly adminRepository: Repository<AdminEntity>,
  ) {}

  async getAllAdmins() {
    const admins = await this.adminRepository.find({
      select: ['id', 'name', 'email', 'is_active', 'created_at', 'updated_at']
    });

    return admins.map(a => ({ ...a, isActive: a.is_active }));
  }

  async getAdminById(id: number) {
    const admin = await this.adminRepository.findOne({
      where: { id },
      select: ['id', 'name', 'email', 'is_active', 'created_at', 'updated_at']
    });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    return { ...admin, isActive: admin.is_active };
  }

  async createAdmin(dto: CreateAdminDto) {
    // Check if admin with email already exists
    const existingAdmin = await this.adminRepository.findOne({
      where: { email: dto.email }
    });

    if (existingAdmin) {
      throw new ConflictException(`Admin with email ${dto.email} already exists`);
    }

    const admin = this.adminRepository.create({
      name: dto.name,
      email: dto.email,
      password: TextEncryptor.userPasswordEncrypt(dto.password),
    });

    const createdAdmin = await this.adminRepository.save(admin);

    return {
      id: createdAdmin.id,
      name: createdAdmin.name,
      email: createdAdmin.email,
      created_at: createdAdmin.created_at,
      updated_at: createdAdmin.updated_at,
    };
  }

  async updateAdmin(id: number, dto: UpdateAdminDto) {
    // Check if admin exists
    const admin = await this.adminRepository.findOne({
      where: { id }
    });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    // Check if email is being updated and if it's already taken
    if (dto.email && dto.email !== admin.email) {
      const existingAdmin = await this.adminRepository.findOne({
        where: { email: dto.email }
      });

      if (existingAdmin) {
        throw new ConflictException(`Admin with email ${dto.email} already exists`);
      }
    }

    // Update admin
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.password) updateData.password = TextEncryptor.userPasswordEncrypt(dto.password);
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;

    await this.adminRepository.update(id, updateData);

    // Return updated admin
    const updatedAdmin = await this.adminRepository.findOne({
      where: { id },
      select: ['id', 'name', 'email', 'is_active', 'created_at', 'updated_at']
    });

    return updatedAdmin ? { ...updatedAdmin, isActive: updatedAdmin.is_active } : null;
  }
}