import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('admins')
export class AdminEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;
}