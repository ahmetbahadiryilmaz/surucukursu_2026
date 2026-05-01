import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DistrictEntity } from './district.entity';

@Entity('cities')
export class CityEntity extends BaseEntity {
  @Column()
  name: string;

  @OneToMany(() => DistrictEntity, district => district.city)
  districts: DistrictEntity[];
}