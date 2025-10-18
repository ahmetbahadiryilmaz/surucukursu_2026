import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DrivingSchoolCarEntity } from '@surucukursu/shared';

@Injectable()
export class CarsService {
    constructor(
      @InjectRepository(DrivingSchoolCarEntity)
      private readonly carRepository: Repository<DrivingSchoolCarEntity>,
    ) {}

    async getCars(code: string) {
        const cars = await this.carRepository.find({
            where: { school_id: parseInt(code) },
            select: ['id', 'model', 'plate_number', 'school_id', 'year']
        });

        if (!cars.length) {
             //return empty array if no cars found
            return [];
        }

        return cars;
    }
}