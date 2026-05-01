import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('driving_school_student_integration_infos')
export class DrivingSchoolStudentIntegrationInfoEntity extends BaseEntity {
  @Column()
  external_id: string;

  @Column('longtext')
  integration_data: string;

  @Column({ unique: true })
  student_id: number;
}