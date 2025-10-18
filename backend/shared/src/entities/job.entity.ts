import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolEntity } from './driving-school.entity';

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum JobType {
  PDF_GENERATION = 'pdf_generation'
}

@Entity('jobs')
export class JobEntity extends BaseEntity {
  @Column({
    type: 'enum',
    enum: JobType,
    default: JobType.PDF_GENERATION
  })
  type: JobType;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.PENDING
  })
  status: JobStatus;

  @Column({ type: 'int', default: 0 })
  progress_percentage: number;

  @Column({ nullable: true })
  error_message?: string;

  @Column()
  school_id: number;

  @ManyToOne(() => DrivingSchoolEntity)
  @JoinColumn({ name: 'school_id' })
  school: DrivingSchoolEntity;

  @Column({ type: 'int', nullable: true })
  completed_at?: number;
}