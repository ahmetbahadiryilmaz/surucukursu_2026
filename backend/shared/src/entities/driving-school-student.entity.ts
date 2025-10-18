import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolEntity } from './driving-school.entity';

@Entity('driving_school_students')
export class DrivingSchoolStudentEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  email?: string;

  @Column()
  phone: string;

  @Column({ unique: true })
  tc_number: string;

  @Column()
  school_id: number;

  @ManyToOne(() => DrivingSchoolEntity, school => school.students)
  @JoinColumn({ name: 'school_id' })
  school: DrivingSchoolEntity;
}