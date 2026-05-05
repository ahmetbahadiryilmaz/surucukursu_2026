import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolStudentMebbisEntity } from './driving-school-student-mebbis.entity';

/**
 * One row per practical exam taken by a student (scraped from skt02009 dgUygulamaNot).
 */
@Entity('driving_school_student_mebbis_exams')
@Index(['school_id', 'sinav_tarihi'])
@Index(['school_id', 'plaka'])
@Index(['student_mebbis_id'])
export class DrivingSchoolStudentMebbisExamEntity extends BaseEntity {
  @Column()
  student_mebbis_id: number;

  /** Denormalized for fast school-scoped queries (e.g. "all exams this week"). */
  @Column()
  school_id: number;

  @Column({ nullable: true }) donem: string;
  @Column({ nullable: true }) sinav_kodu: string;
  /** Raw string from MEBBIS, e.g. "25/04/2026" — keep as string to round-trip exactly. */
  @Column({ nullable: true }) sinav_tarihi: string;
  @Column({ nullable: true }) plaka: string;
  @Column({ nullable: true }) usta_ogretici: string;
  @Column({ nullable: true }) onay_durumu: string;
  @Column({ nullable: true }) sinav_durumu: string;
  @Column({ nullable: true }) sonuc: string;

  @ManyToOne(() => DrivingSchoolStudentMebbisEntity, m => m.exams, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_mebbis_id' })
  studentMebbis: DrivingSchoolStudentMebbisEntity;
}
