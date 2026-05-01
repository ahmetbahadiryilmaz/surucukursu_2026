import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { CityEntity } from './city.entity';

@Entity('districts')
export class DistrictEntity extends BaseEntity {
  @Column()
  name: string;

  @Column()
  city_id: number;

  @ManyToOne(() => CityEntity, city => city.districts)
  @JoinColumn({ name: 'city_id' })
  city: CityEntity;
}