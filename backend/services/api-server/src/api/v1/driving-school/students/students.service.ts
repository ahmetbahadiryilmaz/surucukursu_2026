import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DrivingSchoolStudentEntity } from '@surucukursu/shared';

@Injectable()
export class StudentsService {
    constructor(
      @InjectRepository(DrivingSchoolStudentEntity)
      private readonly studentRepository: Repository<DrivingSchoolStudentEntity>,
    ) {}

    async getStudents(code: string) {
        const students = await this.studentRepository.find({
            where: { school_id: parseInt(code) },
            relations: ['school'],
            select: ['id', 'email', 'name', 'phone', 'school', 'created_at', 'updated_at']
        });

        if (!students.length) {
            return [];
        }

        return students;
    }
}