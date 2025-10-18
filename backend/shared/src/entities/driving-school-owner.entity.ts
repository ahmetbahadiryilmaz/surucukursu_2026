import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolEntity } from './driving-school.entity';

@Entity('driving_school_owners')
export class DrivingSchoolOwnerEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  phone: string;

  @OneToMany(() => DrivingSchoolEntity, school => school.owner)
  DrivingSchool: DrivingSchoolEntity[];
}