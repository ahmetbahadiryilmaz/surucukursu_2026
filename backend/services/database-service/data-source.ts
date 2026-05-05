import { DataSource } from 'typeorm';
import { 
  env,
  getDatabaseServiceConfig,
  AdminEntity,
  SessionEntity,
  SubscriptionEntity,
  DrivingSchoolEntity,
  DrivingSchoolManagerEntity,
  DrivingSchoolOwnerEntity,
  DrivingSchoolSettingsEntity,
  DrivingSchoolStudentEntity,
  DrivingSchoolStudentMebbisEntity,
  DrivingSchoolStudentMebbisExamEntity,
  DrivingSchoolStudentMebbisLessonEntity,
  DrivingSchoolCarEntity,
  MebbisCookie,
  SystemLogsEntity,
  CityEntity,
  DistrictEntity,
  JobEntity,
  PasswordResetTokenEntity
} from '@surucukursu/shared';

const entities = [
  AdminEntity,
  SessionEntity,
  SubscriptionEntity,
  DrivingSchoolEntity,
  DrivingSchoolManagerEntity,
  DrivingSchoolOwnerEntity,
  DrivingSchoolSettingsEntity,
  DrivingSchoolStudentEntity,
  DrivingSchoolStudentMebbisEntity,
  DrivingSchoolStudentMebbisExamEntity,
  DrivingSchoolStudentMebbisLessonEntity,
  DrivingSchoolCarEntity,
  MebbisCookie,
  SystemLogsEntity,
  CityEntity,
  DistrictEntity,
  JobEntity,
  PasswordResetTokenEntity
];

// IMPORTANT: only match timestamped migration class files. The entry-point
// scripts migrate.ts / migrate-fresh.ts live in the same directory; including
// them here causes runMigrations() to import migrate-fresh.ts which executes
// migrateFresh() at file load and drops all tables.
const migrations = [__dirname + '/migrations/[0-9]*-*.{ts,js}'];

export const dataSource = new DataSource(
  getDatabaseServiceConfig(entities, migrations)
);