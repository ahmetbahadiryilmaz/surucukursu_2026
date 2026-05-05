import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolStudentMebbisEntity } from './driving-school-student-mebbis.entity';

/**
 * One row per scheduled/completed driving lesson (scraped from skt02009 dgDersProgrami).
 */
@Entity('driving_school_student_mebbis_lessons')
@Index(['school_id', 'ders_tarihi'])
@Index(['school_id', 'plaka'])
@Index(['school_id', 'personel'])
@Index(['student_mebbis_id'])
export class DrivingSchoolStudentMebbisLessonEntity extends BaseEntity {
  @Column()
  student_mebbis_id: number;

  /** Denormalized for fast school-scoped queries. */
  @Column()
  school_id: number;

  @Column({ nullable: true }) donem: string;
  @Column({ nullable: true }) grup_adi: string;
  @Column({ nullable: true }) grup_baslama: string;
  @Column({ nullable: true }) sube: string;
  /** Plate without "(Manuel)" / "(Otomatik)" suffix — pre-stripped at scrape time. */
  @Column({ nullable: true }) plaka: string;
  @Column({ nullable: true }) ders_yeri: string;
  @Column({ nullable: true }) ders_tarihi: string;
  @Column({ nullable: true }) ders_saati: string;
  @Column({ nullable: true }) personel: string;
  @Column({ nullable: true }) egitim_turu: string;

  @ManyToOne(() => DrivingSchoolStudentMebbisEntity, m => m.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_mebbis_id' })
  studentMebbis: DrivingSchoolStudentMebbisEntity;
}
