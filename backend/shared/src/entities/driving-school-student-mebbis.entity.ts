import { Entity, Column, OneToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolStudentEntity } from './driving-school-student.entity';
import { DrivingSchoolStudentMebbisExamEntity } from './driving-school-student-mebbis-exam.entity';
import { DrivingSchoolStudentMebbisLessonEntity } from './driving-school-student-mebbis-lesson.entity';

/**
 * MEBBIS snapshot for a student. 1:1 with driving_school_students.
 * Only fields directly extractable from MEBBIS skt02006 (list) and skt02009 (detail).
 * Exams and lessons are normalized into separate child tables for fast filtering.
 */
@Entity('driving_school_student_mebbis')
@Index(['school_id'])
@Index(['school_id', 'has_detail'])
@Index(['school_id', 'durum'])
export class DrivingSchoolStudentMebbisEntity extends BaseEntity {
  @Column({ unique: true })
  student_id: number;

  /** Denormalized for fast school-scoped queries without joining students. */
  @Column()
  school_id: number;

  /** The desktop MEBBIS account that scraped this. Useful for audit / multi-account. */
  @Column({ nullable: true })
  mebbis_account_id: string;

  @Column({ default: false })
  has_detail: boolean;

  // ── from skt02006 (list) ───────────────────────────────────────────
  @Column({ nullable: true }) donem: string;
  @Column({ nullable: true }) grup: string;
  @Column({ nullable: true }) sube: string;
  @Column({ nullable: true }) durum: string;

  // ── from skt02009 (detail) ─────────────────────────────────────────
  @Column({ nullable: true, type: 'varchar', length: 500 }) kurum: string;
  @Column({ nullable: true }) mevcut_belge: string;
  @Column({ nullable: true }) istenen_sertifika: string;
  @Column({ nullable: true }) kurum_onay: string;
  @Column({ nullable: true }) ilce_onay: string;
  @Column({ nullable: true }) uygulama: string;
  @Column({ nullable: true, type: 'int' }) teorik_hak: number;
  @Column({ nullable: true, type: 'int' }) uygulama_hak: number;
  @Column({ nullable: true, type: 'int' }) esinav_hak: number;
  @Column({ nullable: true, type: 'int' }) kayit_ucreti: number;

  // ── Aday kişisel bilgileri (K Belgesi'nde manuel doldurulur, geri kaydedilir) ──
  @Column({ nullable: true, type: 'varchar', length: 100 }) baba_ad: string;
  @Column({ nullable: true, type: 'varchar', length: 100 }) dogum_yeri: string;
  @Column({ nullable: true, type: 'varchar', length: 20 })  dogum_tarihi: string;
  @Column({ nullable: true, type: 'varchar', length: 500 }) adres: string;

  // ── timestamps (epoch seconds) ─────────────────────────────────────
  @Column({ type: 'int', unsigned: true, nullable: true }) last_list_seen_at: number;
  @Column({ type: 'int', unsigned: true, nullable: true }) last_detail_seen_at: number;

  @OneToOne(() => DrivingSchoolStudentEntity, student => student.mebbis, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: DrivingSchoolStudentEntity;

  @OneToMany(() => DrivingSchoolStudentMebbisExamEntity, e => e.studentMebbis)
  exams: DrivingSchoolStudentMebbisExamEntity[];

  @OneToMany(() => DrivingSchoolStudentMebbisLessonEntity, l => l.studentMebbis)
  lessons: DrivingSchoolStudentMebbisLessonEntity[];
}
