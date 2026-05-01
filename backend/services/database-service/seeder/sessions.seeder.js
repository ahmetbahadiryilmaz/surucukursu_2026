"use strict";
/**
 * Sessions Seeder
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionsSeeder = void 0;
const typeorm_seeding_1 = require("@jorgebodega/typeorm-seeding");
const shared_1 = require("@surucukursu/shared");
var UserTypes;
(function (UserTypes) {
    UserTypes[UserTypes["ADMIN"] = 1] = "ADMIN";
    UserTypes[UserTypes["DRIVING_SCHOOL_OWNER"] = 2] = "DRIVING_SCHOOL_OWNER";
    UserTypes[UserTypes["DRIVING_SCHOOL_MANAGER"] = 3] = "DRIVING_SCHOOL_MANAGER";
})(UserTypes || (UserTypes = {}));
class SessionsSeeder extends typeorm_seeding_1.Seeder {
    async run(dataSource) {
        console.log('🔐 Creating active sessions...');
        const sessionRepository = dataSource.getRepository(shared_1.SessionEntity);
        const adminRepository = dataSource.getRepository(shared_1.AdminEntity);
        const ownerRepository = dataSource.getRepository(shared_1.DrivingSchoolOwnerEntity);
        const managerRepository = dataSource.getRepository(shared_1.DrivingSchoolManagerEntity);
        // Get some users
        const admins = await adminRepository.find({ take: 2 });
        const owners = await ownerRepository.find({ take: 1 });
        const managers = await managerRepository.find({ take: 1 });
        if (admins.length < 2 || owners.length < 1 || managers.length < 1) {
            console.log('⚠️ Not enough users found, skipping sessions seeding');
            return;
        }
        // Prepare sessions data
        const sessionsData = [
            {
                token: `session-${admins[0].id}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                expires_at: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000),
                user_type: UserTypes.ADMIN,
                user_id: admins[0].id
            },
            {
                token: `session-${admins[1].id}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                expires_at: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000),
                user_type: UserTypes.ADMIN,
                user_id: admins[1].id
            },
            {
                token: `session-${owners[0].id}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                expires_at: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000),
                user_type: UserTypes.DRIVING_SCHOOL_OWNER,
                user_id: owners[0].id
            },
            {
                token: `session-${managers[0].id}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                expires_at: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000),
                user_type: UserTypes.DRIVING_SCHOOL_MANAGER,
                user_id: managers[0].id
            }
        ];
        // Bulk insert sessions
        console.log(`🔐 Inserting ${sessionsData.length} sessions in batch...`);
        await sessionRepository
            .createQueryBuilder()
            .insert()
            .into(shared_1.SessionEntity)
            .values(sessionsData)
            .execute();
        console.log(`✅ Created ${sessionsData.length} active sessions using batch insert`);
    }
}
exports.SessionsSeeder = SessionsSeeder;
