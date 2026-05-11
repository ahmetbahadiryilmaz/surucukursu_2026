import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolPersonnelEntity } from './driving-school-personnel.entity';

/**
 * "Derse Gireceği Programlar" rows from ook12002 detail.
 * Replaced fully on every detail scrape (idempotent).
 */
@Entity('driving_school_personnel_programs')
@Index(['personnel_id'])
export class DrivingSchoolPersonnelProgramEntity extends BaseEntity {
  @Column() personnel_id: number;

  @Column({ nullable: true, type: 'varchar', length: 500 }) program: string;
  @Column({ nullable: true }) tip: string;

  @ManyToOne(() => DrivingSchoolPersonnelEntity, p => p.programs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'personnel_id' })
  personnel: DrivingSchoolPersonnelEntity;
}
