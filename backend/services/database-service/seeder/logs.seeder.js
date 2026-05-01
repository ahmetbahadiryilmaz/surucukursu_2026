"use strict";
/**
 * System Logs Seeder
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogsSeeder = void 0;
const typeorm_seeding_1 = require("@jorgebodega/typeorm-seeding");
const shared_1 = require("@surucukursu/shared");
var UserTypes;
(function (UserTypes) {
    UserTypes[UserTypes["ADMIN"] = 1] = "ADMIN";
    UserTypes[UserTypes["DRIVING_SCHOOL_OWNER"] = 2] = "DRIVING_SCHOOL_OWNER";
    UserTypes[UserTypes["DRIVING_SCHOOL_MANAGER"] = 3] = "DRIVING_SCHOOL_MANAGER";
})(UserTypes || (UserTypes = {}));
var SystemLogProcessTypes;
(function (SystemLogProcessTypes) {
    SystemLogProcessTypes[SystemLogProcessTypes["LOGIN"] = 1] = "LOGIN";
    SystemLogProcessTypes[SystemLogProcessTypes["LOGOUT"] = 2] = "LOGOUT";
    SystemLogProcessTypes[SystemLogProcessTypes["PASSWORD_CHANGE"] = 3] = "PASSWORD_CHANGE";
    SystemLogProcessTypes[SystemLogProcessTypes["PROFILE_UPDATE"] = 4] = "PROFILE_UPDATE";
    SystemLogProcessTypes[SystemLogProcessTypes["SCHOOL_CREATE"] = 5] = "SCHOOL_CREATE";
    SystemLogProcessTypes[SystemLogProcessTypes["SCHOOL_UPDATE"] = 6] = "SCHOOL_UPDATE";
    SystemLogProcessTypes[SystemLogProcessTypes["STUDENT_CREATE"] = 7] = "STUDENT_CREATE";
    SystemLogProcessTypes[SystemLogProcessTypes["STUDENT_UPDATE"] = 8] = "STUDENT_UPDATE";
    SystemLogProcessTypes[SystemLogProcessTypes["CAR_CREATE"] = 9] = "CAR_CREATE";
    SystemLogProcessTypes[SystemLogProcessTypes["CAR_UPDATE"] = 10] = "CAR_UPDATE";
})(SystemLogProcessTypes || (SystemLogProcessTypes = {}));
class LogsSeeder extends typeorm_seeding_1.Seeder {
    async run(dataSource) {
        console.log('📋 Creating system logs...');
        const logsRepository = dataSource.getRepository(shared_1.SystemLogsEntity);
        const adminRepository = dataSource.getRepository(shared_1.AdminEntity);
        const ownerRepository = dataSource.getRepository(shared_1.DrivingSchoolOwnerEntity);
        const managerRepository = dataSource.getRepository(shared_1.DrivingSchoolManagerEntity);
        // Get some users
        const admins = await adminRepository.find({ skip: 2, take: 10 });
        const owners = await ownerRepository.find({ take: 5 });
        const managers = await managerRepository.find({ take: 8 });
        const logUsers = [
            ...admins.map(a => ({ id: a.id, type: UserTypes.ADMIN })),
            ...owners.map(o => ({ id: o.id, type: UserTypes.DRIVING_SCHOOL_OWNER })),
            ...managers.map(m => ({ id: m.id, type: UserTypes.DRIVING_SCHOOL_MANAGER }))
        ];
        if (logUsers.length === 0) {
            console.log('⚠️ No users found, skipping logs seeding');
            return;
        }
        const processTypeValues = Object.values(SystemLogProcessTypes).filter(value => typeof value === 'number');
        // Prepare system logs data
        const systemLogsData = [];
        for (let i = 0; i < 100; i++) {
            const randomUser = logUsers[Math.floor(Math.random() * logUsers.length)];
            const randomProcess = processTypeValues[Math.floor(Math.random() * processTypeValues.length)];
            systemLogsData.push({
                user_id: randomUser.id,
                user_type: randomUser.type,
                process: randomProcess,
                description: `System process ${SystemLogProcessTypes[randomProcess]} executed by user ${randomUser.id}`,
                created_at: Math.floor((Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) / 1000)
            });
        }
        // Bulk insert system logs
        console.log(`📋 Inserting ${systemLogsData.length} log entries in batch...`);
        await logsRepository
            .createQueryBuilder()
            .insert()
            .into(shared_1.SystemLogsEntity)
            .values(systemLogsData)
            .execute();
        console.log('✅ Created 100 system log entries using batch insert');
    }
}
exports.LogsSeeder = LogsSeeder;
