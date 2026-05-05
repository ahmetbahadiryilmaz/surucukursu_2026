"use strict";
/**
 * Users Seeder
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersSeeder = void 0;
const typeorm_seeding_1 = require("@jorgebodega/typeorm-seeding");
const shared_1 = require("@surucukursu/shared");
const seeder_utils_1 = require("./seeder.utils");
class UsersSeeder extends typeorm_seeding_1.Seeder {
    async run(dataSource) {
        console.log('👥 Seeding users...');
        const adminRepository = dataSource.getRepository(shared_1.AdminEntity);
        const ownerRepository = dataSource.getRepository(shared_1.DrivingSchoolOwnerEntity);
        const managerRepository = dataSource.getRepository(shared_1.DrivingSchoolManagerEntity);
        // Prepare all admins data (including test admin)
        const adminsData = [
            {
                name: 'Test Admin',
                email: 'test@admin.com',
                password: shared_1.TextEncryptor.userPasswordEncrypt('test@admin.com'),
            }
        ];
        for (let i = 0; i < 3; i++) {
            adminsData.push({
                name: (0, seeder_utils_1.getRandomName)(),
                email: `admin${i + 1}@mtsk.app`,
                password: shared_1.TextEncryptor.userPasswordEncrypt(`admin${i + 1}@mtsk.app`),
            });
        }
        // Bulk insert all admins
        console.log(`👤 Inserting ${adminsData.length} admins in batch...`);
        await adminRepository
            .createQueryBuilder()
            .insert()
            .into(shared_1.AdminEntity)
            .values(adminsData)
            .execute();
        // Prepare owners data (including test owner)
        const ownersData = [
            {
                name: 'Test Sürücü Kursu Sahibi',
                email: 'test@mtsk.app',
                password: shared_1.TextEncryptor.userPasswordEncrypt('test@mtsk.app'),
                phone: (0, seeder_utils_1.generatePhoneNumber)()
            }
        ];
        for (let i = 0; i < 10; i++) {
            ownersData.push({
                name: (0, seeder_utils_1.getRandomName)(),
                email: `owner${i + 1}@mtsk.app`,
                password: shared_1.TextEncryptor.userPasswordEncrypt(`owner${i + 1}@mtsk.app`),
                phone: (0, seeder_utils_1.generatePhoneNumber)()
            });
        }
        // Bulk insert owners
        console.log(`👥 Inserting ${ownersData.length} owners in batch...`);
        await ownerRepository
            .createQueryBuilder()
            .insert()
            .into(shared_1.DrivingSchoolOwnerEntity)
            .values(ownersData)
            .execute();
        // Prepare managers data
        const managersData = [];
        for (let i = 0; i < 15; i++) {
            managersData.push({
                name: (0, seeder_utils_1.getRandomName)(),
                email: `manager${i + 1}@mtsk.app`,
                password: shared_1.TextEncryptor.userPasswordEncrypt(`manager${i + 1}@mtsk.app`),
                phone: (0, seeder_utils_1.generatePhoneNumber)()
            });
        }
        // Bulk insert managers
        console.log(`👔 Inserting ${managersData.length} managers in batch...`);
        await managerRepository
            .createQueryBuilder()
            .insert()
            .into(shared_1.DrivingSchoolManagerEntity)
            .values(managersData)
            .execute();
        console.log(`✅ Created ${adminsData.length} admins, ${ownersData.length} owners, ${managersData.length} managers using batch inserts`);
    }
}
exports.UsersSeeder = UsersSeeder;
