import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('password_reset_tokens')
export class PasswordResetTokenEntity extends BaseEntity {
  @Column({ length: 512, unique: true })
  token: string;

  @Column()
  email: string;

  @Column({ type: 'int', unsigned: true })
  expires_at: number;

  @Column({ default: false })
  used: boolean;
}
