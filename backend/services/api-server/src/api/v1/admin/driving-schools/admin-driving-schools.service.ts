// src/api/v1/admin/driving-schools/admin-driving-schools.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DrivingSchoolEntity, SubscriptionEntity, SystemLogsEntity, SessionEntity, DrivingSchoolStudentEntity, DrivingSchoolCarEntity } from '@surucukursu/shared';
import { UserTypes, SystemLogProcessTypes } from '../../auth/dto/enum';
import * as crypto from 'crypto';
import { CreateDrivingSchoolDto, UpdateDrivingSchoolDto } from './dto';
import { TextEncryptor } from '@surucukursu/shared';

@Injectable()
export class AdminDrivingSchoolsService {
    constructor(
        @InjectRepository(DrivingSchoolEntity)
        private readonly schoolRepository: Repository<DrivingSchoolEntity>,
        @InjectRepository(SubscriptionEntity)
        private readonly subscriptionRepository: Repository<SubscriptionEntity>,
        @InjectRepository(SystemLogsEntity)
        private readonly systemLogsRepository: Repository<SystemLogsEntity>,
        @InjectRepository(SessionEntity)
        private readonly sessionRepository: Repository<SessionEntity>,
        @InjectRepository(DrivingSchoolStudentEntity)
        private readonly studentRepository: Repository<DrivingSchoolStudentEntity>,
        @InjectRepository(DrivingSchoolCarEntity)
        private readonly carRepository: Repository<DrivingSchoolCarEntity>,
        private jwtService: JwtService
    ) { }

    async getAllDrivingSchools() {
        const schools = await this.schoolRepository.find({
            relations: ['owner', 'manager', 'city', 'district', 'subscription']
        });

        // Add subscription_id at same level as owner_id
        return schools.map(school => ({
            ...school,
            subscription_id: school.subscription?.id || null
        }));
    }

    async getDrivingSchoolById(id: number) {
        const school = await this.schoolRepository.findOne({
            where: { id },
            relations: ['owner', 'manager', 'city', 'district', 'subscription', 'students', 'cars']
        });

        if (!school) {
            throw new NotFoundException(`Driving school with ID ${id} not found`);
        }

        // Add subscription_id at same level as owner_id
        return {
            ...school,
            subscription_id: school.subscription?.id || null
        };
    }

    async createDrivingSchool(dto: CreateDrivingSchoolDto, adminId: number) {
        // Create the driving school
        const school = this.schoolRepository.create({
            name: dto.name,
            phone: dto.phone,
            address: dto.address,
            owner_id: dto.owner_id,
            manager_id: dto.manager_id,
            city_id: dto.city_id,
            district_id: dto.district_id,
            created_by: adminId,
        });

        const savedSchool = await this.schoolRepository.save(school);

        // Create subscription - always create for new driving school
        const subscriptionData = dto.subscription || {
            type: 'demo',
            pdf_print_limit: 10,
            ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        };

        const subscription = this.subscriptionRepository.create({
            driving_school_id: savedSchool.id,
            type: subscriptionData.type,
            pdf_print_limit: subscriptionData.pdf_print_limit || (subscriptionData.type === 'demo' ? 10 : null),
            pdf_print_used: 0,
            ends_at: subscriptionData.ends_at ? Math.floor(new Date(subscriptionData.ends_at).getTime() / 1000) : null
        });

        const savedSubscription = await this.subscriptionRepository.save(subscription);

        // Log the creation
        const log = this.systemLogsRepository.create({
            user_id: adminId,
            user_type: UserTypes.ADMIN,
            process: SystemLogProcessTypes.UPDATE_PROFILE, // Using existing enum
            description: `Admin created driving school: ${savedSchool.name}`
        });

        await this.systemLogsRepository.save(log);

        // Return with subscription_id at same level as owner_id
        return {
            ...savedSchool,
            subscription_id: savedSubscription.id,
            subscription: {
                id: savedSubscription.id,
                type: savedSubscription.type,
                pdf_print_limit: savedSubscription.pdf_print_limit,
                pdf_print_used: savedSubscription.pdf_print_used,
                created_at: savedSubscription.created_at,
                updated_at: savedSubscription.updated_at,
                ends_at: savedSubscription.ends_at
            }
        };
    }

    async updateDrivingSchool(id: number, dto: UpdateDrivingSchoolDto, adminId: number) {
        const school = await this.schoolRepository.findOne({
            where: { id },
            relations: ['subscription']
        });

        if (!school) {
            throw new NotFoundException(`Driving school with ID ${id} not found`);
        }

        // Update the driving school
        const updateData: any = {};
        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.phone !== undefined) updateData.phone = dto.phone;
        if (dto.address !== undefined) updateData.address = dto.address;
        if (dto.owner_id !== undefined) updateData.owner_id = dto.owner_id;
        if (dto.manager_id !== undefined) updateData.manager_id = dto.manager_id;
        if (dto.city_id !== undefined) updateData.city_id = dto.city_id;
        if (dto.district_id !== undefined) updateData.district_id = dto.district_id;

        await this.schoolRepository.update(id, updateData);

        // Handle subscription - always ensure subscription exists
        let subscription;
        
        if (dto.subscription) {
            if (school.subscription) {
                // Update existing subscription
                const subUpdateData: any = {
                    type: dto.subscription.type,
                    pdf_print_limit: dto.subscription.pdf_print_limit !== undefined 
                        ? dto.subscription.pdf_print_limit 
                        : (dto.subscription.type === 'demo' ? 10 : null)
                };
                if (dto.subscription.ends_at) {
                    subUpdateData.ends_at = Math.floor(new Date(dto.subscription.ends_at).getTime() / 1000);
                }
                await this.subscriptionRepository.update(school.subscription.id, subUpdateData);
                subscription = await this.subscriptionRepository.findOne({ where: { id: school.subscription.id } });
            } else {
                // Create new subscription
                const newSub = this.subscriptionRepository.create({
                    driving_school_id: id,
                    type: dto.subscription.type,
                    pdf_print_limit: dto.subscription.pdf_print_limit !== undefined 
                        ? dto.subscription.pdf_print_limit 
                        : (dto.subscription.type === 'demo' ? 10 : null),
                    pdf_print_used: 0,
                    ends_at: dto.subscription.ends_at ? Math.floor(new Date(dto.subscription.ends_at).getTime() / 1000) : null
                });
                subscription = await this.subscriptionRepository.save(newSub);
            }
        } else {
            // If no subscription data provided, ensure subscription exists
            if (!school.subscription) {
                // Create default subscription if none exists
                const newSub = this.subscriptionRepository.create({
                    driving_school_id: id,
                    type: 'demo',
                    pdf_print_limit: 10,
                    pdf_print_used: 0,
                    ends_at: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000) // 30 days from now
                });
                subscription = await this.subscriptionRepository.save(newSub);
            } else {
                // Keep existing subscription unchanged
                subscription = school.subscription;
            }
        }

        // Log the update
        const log = this.systemLogsRepository.create({
            user_id: adminId,
            user_type: UserTypes.ADMIN,
            process: SystemLogProcessTypes.UPDATE_PROFILE,
            description: `Admin updated driving school: ${school.name}`
        });

        await this.systemLogsRepository.save(log);

        // Return updated school
        const updatedSchool = await this.schoolRepository.findOne({
            where: { id },
            relations: ['owner', 'manager', 'city', 'district']
        });

        // Return with subscription_id at same level as owner_id
        return {
            ...updatedSchool,
            subscription_id: subscription?.id || null,
            subscription: subscription ? {
                id: subscription.id,
                type: subscription.type,
                pdf_print_limit: subscription.pdf_print_limit,
                pdf_print_used: subscription.pdf_print_used,
                created_at: subscription.created_at,
                updated_at: subscription.updated_at,
                ends_at: subscription.ends_at
            } : null
        };
    }
 
    async deleteDrivingSchool(id: number, adminId: number) {
        const school = await this.schoolRepository.findOne({
            where: { id }
        });

        if (!school) {
            throw new NotFoundException(`Driving school with ID ${id} not found`);
        }
   
        await this.schoolRepository.update(id, { deleted_at: Math.floor(Date.now() / 1000) });
        
        await this.studentRepository.update({ school_id: id }, { deleted_at: Math.floor(Date.now() / 1000) });
        await this.carRepository.update({ school_id: id }, { deleted_at: Math.floor(Date.now() / 1000) });
        
        // Log the deletion
        const log = this.systemLogsRepository.create({
            user_id: adminId,
            user_type: UserTypes.ADMIN,
            process: SystemLogProcessTypes.UPDATE_PROFILE,
            description: `Admin deleted driving school with ID: ${id}`
        });
        
        await this.systemLogsRepository.save(log);
        
        return { message: 'Driving school deleted successfully' };
    }

    async loginAs(code: string) {
        // Find driving school and its manager
        const drivingSchool = await this.schoolRepository.findOne({
            where: { id: parseInt(code) },
            relations: ['manager', 'subscription']
        });

        if (!drivingSchool || !drivingSchool.manager) {
            throw new NotFoundException('Driving school or manager not found');
        }

        // Delete any existing sessions for the manager
        await this.sessionRepository.delete({
            user_id: drivingSchool.manager.id,
            user_type: UserTypes.DRIVING_SCHOOL_MANAGER
        });

        // Generate new token
        const token = this.jwtService.sign({
            id: drivingSchool.manager.id,
            email: drivingSchool.manager.email,
            userType: UserTypes.DRIVING_SCHOOL_MANAGER,
            date: Math.floor(Date.now() / 1000),
            jwtid: crypto.randomUUID(),
        });

        // Create new session
        const session = this.sessionRepository.create({
            token,
            user_id: drivingSchool.manager.id,
            user_type: UserTypes.DRIVING_SCHOOL_MANAGER,
            expires_at: Math.floor((Date.now() + Number(process.env.SESSION_EXPIRY) * 1000) / 1000),
        });

        await this.sessionRepository.save(session);

        // Log the login action
        const log = this.systemLogsRepository.create({
            user_id: drivingSchool.manager.id,
            user_type: UserTypes.DRIVING_SCHOOL_MANAGER,
            process: SystemLogProcessTypes.LOGIN,
            description: `Admin logged in as manager: ${drivingSchool.manager.email} for school ${drivingSchool.name}`
        });

        await this.systemLogsRepository.save(log);

        return {
            token,
            user: {
                id: drivingSchool.manager.id,
                email: drivingSchool.manager.email,
                name: drivingSchool.manager.name,
                userType: UserTypes.DRIVING_SCHOOL_MANAGER,
                school: {
                    id: drivingSchool.id,
                    name: drivingSchool.name,
                    subscription: drivingSchool.subscription
                }
            }
        };
    }
}