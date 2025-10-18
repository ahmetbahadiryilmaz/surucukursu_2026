import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolEntity } from './driving-school.entity';

@Entity('driving_school_cars')
export class DrivingSchoolCarEntity extends BaseEntity {
  @Column()
  model: string;

  @Column({ unique: true })
  plate_number: string;

  @Column()
  year: number;

  @Column()
  school_id: number;

  @ManyToOne(() => DrivingSchoolEntity, school => school.cars)
  @JoinColumn({ name: 'school_id' })
  school: DrivingSchoolEntity;
}