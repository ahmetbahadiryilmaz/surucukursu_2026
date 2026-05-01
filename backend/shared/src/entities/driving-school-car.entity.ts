import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolEntity } from './driving-school.entity';

export enum CarType {
  REGULAR_CAR = 'regular_car',
  SIMULATOR = 'simulator',
}

@Entity('driving_school_cars')
export class DrivingSchoolCarEntity extends BaseEntity {
  @Column({ type: 'enum', enum: CarType, default: CarType.REGULAR_CAR })
  car_type: CarType;

  // Common fields
  @Column()
  model: string;

  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true, unique: true })
  plate_number: string;

  @Column({ nullable: true })
  year: number;

  // Regular car specific fields
  @Column({ nullable: true })
  purchase_date: Date;

  @Column({ nullable: true })
  last_inspection_date: Date;

  @Column({ nullable: true })
  inspection_validity_date: Date;

  @Column({ nullable: true })
  driver_count: number;

  @Column({ nullable: true })
  lesson_count: number;

  @Column({ nullable: true })
  excuse_days: number;

  // Simulator specific fields
  @Column({ nullable: true, unique: true })
  serial_number: string;

  @Column({ nullable: true })
  start_date: Date;

  @Column({ nullable: true })
  last_maintenance_date: Date;

  @Column({ nullable: true })
  usage_hours: number;

  @Column({ nullable: true })
  license_validity_date: Date;

  // Common status field
  @Column({ nullable: true })
  status: string;

  @Column()
  school_id: number;

  @ManyToOne(() => DrivingSchoolEntity, school => school.cars)
  @JoinColumn({ name: 'school_id' })
  school: DrivingSchoolEntity;
}