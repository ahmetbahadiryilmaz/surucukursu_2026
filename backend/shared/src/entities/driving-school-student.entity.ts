import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolEntity } from './driving-school.entity';

@Entity('driving_school_students')
export class DrivingSchoolStudentEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ unique: true })
  tc_number: string;

  @Column()
  school_id: number;

  // --- MEBBIS Sync Fields ---

  @Column({ nullable: true })
  donem: string;

  @Column({ nullable: true })
  donem_text: string;

  @Column({ nullable: true })
  license_class: string;

  @Column({ nullable: true })
  mebbis_status: string;

  @Column({ nullable: true })
  approval_status: string;

  @Column({ nullable: true })
  ilce_mem_approval: string;

  @Column({ nullable: true })
  exam_date: string;

  @Column({ nullable: true })
  criminal_record_check: string;

  @Column({ nullable: true })
  practice_lessons: string;

  @Column({ nullable: true })
  practice_rights: string;

  @Column({ nullable: true })
  eexam_rights: string;

  @Column({ type: 'int', unsigned: true, nullable: true })
  last_synced_at: number;

  @ManyToOne(() => DrivingSchoolEntity, school => school.students)
  @JoinColumn({ name: 'school_id' })
  school: DrivingSchoolEntity;
}