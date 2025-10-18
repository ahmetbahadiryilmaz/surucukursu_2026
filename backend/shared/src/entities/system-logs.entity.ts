import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('system_logs')
export class SystemLogsEntity extends BaseEntity {
  @Column()
  user_id: number;

  @Column()
  user_type: number;

  @Column()
  process: number;

  @Column('text')
  description: string;
}