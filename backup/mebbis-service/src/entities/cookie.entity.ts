import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('mebbis_cookies')
export class MebbisCookie {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  tbMebbisId: number;

  @Column({ type: 'longtext' })
  cookieData: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cookieName: string;

  @Column({ type: 'boolean', default: true })
  isValid: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'int', nullable: true })
  expiresAt: number; // Unix timestamp, null = no expiration
}
