import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolEntity } from './driving-school.entity';
import { JobStatus, JobType, SimulationType } from '../types/job.types';

@Entity('jobs')
export class JobEntity extends BaseEntity {
  @Column({
    type: 'enum',
    enum: JobType,
    default: null
  })
  type: JobType;

  @Column({
    type: 'enum',
    enum: SimulationType,
    nullable: true
  })
  simulation_type?: SimulationType;

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