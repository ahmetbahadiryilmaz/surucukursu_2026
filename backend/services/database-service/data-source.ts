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
  DrivingSchoolStudentIntegrationInfoEntity,
  DrivingSchoolStudentEntity,
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
  DrivingSchoolStudentIntegrationInfoEntity,
  DrivingSchoolStudentEntity,
  DrivingSchoolCarEntity,
  MebbisCookie,
  SystemLogsEntity,
  CityEntity,
  DistrictEntity,
  JobEntity,
  PasswordResetTokenEntity
];

const migrations = [__dirname + '/migrations/**/*{.ts,.js}'];

export const dataSource = new DataSource(
  getDatabaseServiceConfig(entities, migrations)
);