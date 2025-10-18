import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

const dateTransformer = {
  to: (value: number) => new Date(value * 1000),
  from: (value: Date) => Math.floor(value.getTime() / 1000),
};

@Entity('sessions')
export class SessionEntity extends BaseEntity {
  @Column({ unique: true, length: 512 })
  token: string;

  @Column({ type: 'timestamp', transformer: dateTransformer })
  expires_at: number;

  @Column({ type: 'timestamp', transformer: dateTransformer })
  last_activity: number;

  @Column({ type: 'timestamp', transformer: dateTransformer })
  last_login: number;

  @Column({ nullable: true })
  user_type?: number;

  @Column()
  user_id: number;
}