import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolKurumInfoEntity } from './driving-school-kurum-info.entity';

@Entity('driving_school_kurum_vehicles')
@Index(['kurum_info_id'])
export class DrivingSchoolKurumVehicleEntity extends BaseEntity {
  @Column() kurum_info_id: number;

  @Column({ nullable: true, type: 'varchar', length: 50 }) plaka: string;
  @Column({ nullable: true }) ehliyet_sinifi: string;
  @Column({ nullable: true }) marka: string;
  @Column({ nullable: true, type: 'varchar', length: 500 }) model: string;
  @Column({ nullable: true, type: 'varchar', length: 10 }) model_yili: string;
  @Column({ nullable: true, type: 'varchar', length: 50 }) tescil_tarihi: string;
  @Column({ nullable: true, type: 'varchar', length: 50 }) hizmete_giris: string;
  @Column({ nullable: true, type: 'varchar', length: 50 }) hizmetten_cikis: string;
  @Column({ nullable: true, type: 'varchar', length: 50 }) durum: string;
  @Column({ nullable: true, type: 'varchar', length: 50 }) mem_onay: string;

  @ManyToOne(() => DrivingSchoolKurumInfoEntity, k => k.vehicles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kurum_info_id' })
  kurum_info: DrivingSchoolKurumInfoEntity;
}
