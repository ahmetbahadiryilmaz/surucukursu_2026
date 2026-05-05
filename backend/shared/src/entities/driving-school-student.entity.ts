import { Entity, Column, ManyToOne, JoinColumn, Index, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolEntity } from './driving-school.entity';
import { DrivingSchoolStudentMebbisEntity } from './driving-school-student-mebbis.entity';

export enum DrivingSchoolStudentSource {
  MANUAL = 'manual',
  MEBBIS_SCRAPE = 'mebbis_scrape',
}

/**
 * Canonical student record for a driving school. Thin by design:
 * MEBBIS-derived fields live on DrivingSchoolStudentMebbisEntity (1:1).
 * Future CRM fields (contracts, payments, notes) belong here.
 */
@Entity('driving_school_students')
@Index(['school_id', 'tc_number'], { unique: true })
export class DrivingSchoolStudentEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone: string;

  @Column()
  tc_number: string;

  @Column()
  school_id: number;

  @Column({
    type: 'enum',
    enum: DrivingSchoolStudentSource,
    default: DrivingSchoolStudentSource.MANUAL,
  })
  source: DrivingSchoolStudentSource;

  @ManyToOne(() => DrivingSchoolEntity, school => school.students)
  @JoinColumn({ name: 'school_id' })
  school: DrivingSchoolEntity;

  @OneToOne(() => DrivingSchoolStudentMebbisEntity, mebbis => mebbis.student)
  mebbis?: DrivingSchoolStudentMebbisEntity;
}
