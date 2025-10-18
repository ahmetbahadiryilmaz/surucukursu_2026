import { Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, PrimaryGeneratedColumn, BeforeInsert, BeforeUpdate } from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'int',
    unsigned: true,
    default: () => 'UNIX_TIMESTAMP()',
  })
  created_at: number;

  @Column({
    type: 'int',
    unsigned: true,
    default: () => 'UNIX_TIMESTAMP()',
  })
  updated_at: number;

  @Column({
    type: 'int',
    unsigned: true,
    nullable: true,
    default: null,
  })
  deleted_at?: number | null;

  @BeforeInsert()
  setCreatedAt() {
    const now = Math.floor(Date.now() / 1000);
    this.created_at = now;
    this.updated_at = now;
  }

  @BeforeUpdate()
  setUpdatedAt() {
    this.updated_at = Math.floor(Date.now() / 1000);
  }
}