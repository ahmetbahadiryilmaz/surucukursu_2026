import { Entity, Column, OneToMany, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolStudentEntity } from './driving-school-student.entity';
import { DrivingSchoolCarEntity } from './driving-school-car.entity';
import { DrivingSchoolManagerEntity } from './driving-school-manager.entity';
import { DrivingSchoolOwnerEntity } from './driving-school-owner.entity';
import { DrivingSchoolSettingsEntity } from './driving-school-settings.entity';
import { CityEntity } from './city.entity';
import { DistrictEntity } from './district.entity';
import { SubscriptionEntity } from './subscription.entity';

@Entity('driving_schools')
export class DrivingSchoolEntity extends BaseEntity {
  @Column()
  name: string;

  @Column()
  address: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  mebbis_username?: string;

  @Column({ nullable: true })
  mebbis_password?: string;

 

  @Column({ type: 'boolean', default: false })
  mebbis_credentials_locked: boolean;

  @Column()
  manager_id: number;

  @Column()
  owner_id: number;

  @Column({ nullable: true })
  city_id?: number;

  @Column({ nullable: true })
  district_id?: number;

  @Column({ nullable: true })
  created_by?: number;

  @OneToMany(() => DrivingSchoolStudentEntity, student => student.school)
  students: DrivingSchoolStudentEntity[];

  @OneToMany(() => DrivingSchoolCarEntity, car => car.school)
  cars: DrivingSchoolCarEntity[];

  @ManyToOne(() => DrivingSchoolManagerEntity, manager => manager.schools)
  @JoinColumn({ name: 'manager_id' })
  manager: DrivingSchoolManagerEntity;

  @ManyToOne(() => DrivingSchoolOwnerEntity, owner => owner.DrivingSchool)
  @JoinColumn({ name: 'owner_id' })
  owner: DrivingSchoolOwnerEntity;

  @ManyToOne(() => CityEntity, city => city.districts)
  @JoinColumn({ name: 'city_id' })
  city: CityEntity;

  @ManyToOne(() => DistrictEntity)
  @JoinColumn({ name: 'district_id' })
  district: DistrictEntity;

  @OneToOne(() => DrivingSchoolSettingsEntity, (settings) => settings.driving_school, { nullable: true })
  settings: DrivingSchoolSettingsEntity;

  @OneToOne(() => SubscriptionEntity, subscription => subscription.driving_school_id)
  subscription: SubscriptionEntity;
}