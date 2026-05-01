import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('driving_school_cookies')
export class MebbisCookie {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  driving_school_id: number;

  @Column({ type: 'longtext' })
  cookie_data: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cookie_name?: string;

  @Column({ type: 'boolean', default: true })
  is_valid: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'int', nullable: true })
  expires_at?: number; // Unix timestamp, null = no expiration
}

