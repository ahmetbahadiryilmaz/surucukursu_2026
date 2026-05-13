import { Entity, Column, Index, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolEntity } from './driving-school.entity';
import { DrivingSchoolKurumProgramEntity } from './driving-school-kurum-program.entity';
import { DrivingSchoolKurumVehicleEntity } from './driving-school-kurum-vehicle.entity';

/**
 * MEBBIS skt01001 "Kurum Bilgileri" header snapshot, scoped per driving school.
 * Programs and vehicles live in child tables and are replaced wholesale on every
 * scrape.
 */
@Entity('driving_school_kurum_info')
export class DrivingSchoolKurumInfoEntity extends BaseEntity {
  @Index({ unique: true })
  @Column() school_id: number;

  @Column({ nullable: true }) mebbis_account_id: string;

  @Column({ nullable: true }) kurum_kodu: string;
  @Column({ nullable: true, type: 'varchar', length: 500 }) kurum_adi: string;
  @Column({ nullable: true, type: 'varchar', length: 50 }) kurum_telefon: string;
  @Column({ nullable: true, type: 'varchar', length: 50 }) bina_kontenjan: string;
  @Column({ nullable: true, type: 'varchar', length: 1000 }) kurum_adres: string;
  @Column({ nullable: true, type: 'varchar', length: 500 }) kurum_route: string;
  @Column({ nullable: true, type: 'varchar', length: 50 }) acilma_tarihi: string;

  @Column({ type: 'int', unsigned: true, nullable: true }) last_scraped_at: number;

  @ManyToOne(() => DrivingSchoolEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school: DrivingSchoolEntity;

  @OneToMany(() => DrivingSchoolKurumProgramEntity, p => p.kurum_info)
  programs: DrivingSchoolKurumProgramEntity[];

  @OneToMany(() => DrivingSchoolKurumVehicleEntity, v => v.kurum_info)
  vehicles: DrivingSchoolKurumVehicleEntity[];
}
