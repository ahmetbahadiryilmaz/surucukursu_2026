import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DrivingSchoolPersonnelEntity } from './driving-school-personnel.entity';
import { DrivingSchoolEntity } from './driving-school.entity';

/**
 * Many-to-many between schools and personnel (TC-keyed). Each row records
 * one school's relationship with one personnel record:
 *
 *   - which mebbis account scraped them
 *   - when they were last seen in this school's list/detail scrape
 *
 * A composite unique on (school_id, personnel_id) prevents duplicates.
 */
@Entity('driving_school_personnel_links')
@Index('uk_dspl_school_personnel', ['school_id', 'personnel_id'], { unique: true })
@Index(['personnel_id'])
export class DrivingSchoolPersonnelLinkEntity extends BaseEntity {
  @Column() school_id: number;
  @Column() personnel_id: number;

  /** The desktop MEBBIS account that scraped this link. */
  @Column({ nullable: true }) mebbis_account_id: string;

  @Column({ type: 'int', unsigned: true, nullable: true }) last_list_seen_at: number;
  @Column({ type: 'int', unsigned: true, nullable: true }) last_detail_seen_at: number;

  @ManyToOne(() => DrivingSchoolPersonnelEntity, p => p.links, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'personnel_id' })
  personnel: DrivingSchoolPersonnelEntity;

  @ManyToOne(() => DrivingSchoolEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school: DrivingSchoolEntity;
}
