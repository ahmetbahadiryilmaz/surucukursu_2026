import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tb_mebbis')
export class TbMebbis {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  lastLogin: number;

  @Column({ type: 'boolean', default: false })
  mebbislogin: boolean;

  @Column({ type: 'text', nullable: true })
  cookie: string;
}
