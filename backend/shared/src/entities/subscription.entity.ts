import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolEntity } from './driving-school.entity';

const dateTransformer = {
  to: (value: number) => new Date(value * 1000),
  from: (value: Date) => Math.floor(value.getTime() / 1000),
};

@Entity('subscriptions')
export class SubscriptionEntity extends BaseEntity {
  @Column({ unique: true })
  driving_school_id: number;

  @Column({ default: 'demo' })
  type: string;

  @Column({ nullable: true })
  pdf_print_limit?: number;

  @Column({ default: 0 })
  pdf_print_used: number;

  @Column({ type: 'timestamp', nullable: true, transformer: dateTransformer })
  ends_at?: number;

  @OneToOne(() => DrivingSchoolEntity)
  @JoinColumn({ name: 'driving_school_id' })
  driving_school: DrivingSchoolEntity;
}