import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolEntity } from './driving-school.entity';
import { NotificationPreferences } from '../types/notification.types';

@Entity('driving_school_settings')
export class DrivingSchoolSettingsEntity extends BaseEntity {
  @Column({ unique: true })
  driving_school_id: number;

  @Column({ type: 'varchar', nullable: true })
  simulator_type?: string;

  @Column({ type: 'int', default: NotificationPreferences.DEFAULT })
  notification_preferences: number;

  @OneToOne(() => DrivingSchoolEntity, school => school.settings)
  @JoinColumn({ name: 'driving_school_id' })
  driving_school: DrivingSchoolEntity;
}
