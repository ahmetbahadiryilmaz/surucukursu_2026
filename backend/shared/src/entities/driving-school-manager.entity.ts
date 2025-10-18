import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolEntity } from './driving-school.entity';

@Entity('driving_school_managers')
export class DrivingSchoolManagerEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  phone: string;

  @OneToMany(() => DrivingSchoolEntity, school => school.manager)
  schools: DrivingSchoolEntity[];
}