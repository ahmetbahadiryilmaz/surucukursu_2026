"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataSource = void 0;
const typeorm_1 = require("typeorm");
const shared_1 = require("@surucukursu/shared");
const entities = [
    shared_1.AdminEntity,
    shared_1.SessionEntity,
    shared_1.SubscriptionEntity,
    shared_1.DrivingSchoolEntity,
    shared_1.DrivingSchoolManagerEntity,
    shared_1.DrivingSchoolOwnerEntity,
    shared_1.DrivingSchoolSettingsEntity,
    shared_1.DrivingSchoolStudentIntegrationInfoEntity,
    shared_1.DrivingSchoolStudentEntity,
    shared_1.DrivingSchoolCarEntity,
    shared_1.MebbisCookie,
    shared_1.SystemLogsEntity,
    shared_1.CityEntity,
    shared_1.DistrictEntity,
    shared_1.JobEntity,
    shared_1.PasswordResetTokenEntity
];
const migrations = [__dirname + '/migrations/**/*{.ts,.js}'];
exports.dataSource = new typeorm_1.DataSource((0, shared_1.getDatabaseServiceConfig)(entities, migrations));
