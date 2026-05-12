import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolKurumInfoEntity } from './driving-school-kurum-info.entity';

@Entity('driving_school_kurum_programs')
@Index(['kurum_info_id'])
export class DrivingSchoolKurumProgramEntity extends BaseEntity {
  @Column() kurum_info_id: number;

  @Column({ nullable: true }) ehliyet_sinifi: string;
  @Column({ nullable: true, type: 'varchar', length: 50 }) ruhsat_tarihi: string;
  @Column({ nullable: true, type: 'varchar', length: 50 }) kapanma_tarihi: string;
  @Column({ nullable: true, type: 'varchar', length: 50 }) durum: string;

  @ManyToOne(() => DrivingSchoolKurumInfoEntity, k => k.programs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kurum_info_id' })
  kurum_info: DrivingSchoolKurumInfoEntity;
}
