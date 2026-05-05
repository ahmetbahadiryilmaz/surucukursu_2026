"use strict";
/**
 * Schools, Cars, and Students Seeder
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchoolsSeeder = void 0;
const typeorm_seeding_1 = require("@jorgebodega/typeorm-seeding");
const shared_1 = require("@surucukursu/shared");
const seeder_utils_1 = require("./seeder.utils");
class SchoolsSeeder extends typeorm_seeding_1.Seeder {
    async run(dataSource) {
        console.log('🏫 Seeding schools with cars and students...');
        const schoolRepository = dataSource.getRepository(shared_1.DrivingSchoolEntity);
        const carRepository = dataSource.getRepository(shared_1.DrivingSchoolCarEntity);
        const studentRepository = dataSource.getRepository(shared_1.DrivingSchoolStudentEntity);
        const integrationRepository = dataSource.getRepository(shared_1.DrivingSchoolStudentIntegrationInfoEntity);
        const ownerRepository = dataSource.getRepository(shared_1.DrivingSchoolOwnerEntity);
        const managerRepository = dataSource.getRepository(shared_1.DrivingSchoolManagerEntity);
        // Get all owners and managers
        const owners = await ownerRepository.find();
        const managers = await managerRepository.find();
        if (owners.length === 0 || managers.length === 0) {
            console.log('⚠️ No owners or managers found, skipping schools seeding');
            return;
        }
        // Find the test owner
        const testOwner = owners.find(owner => owner.email === 'test@mtsk.app');
        if (!testOwner) {
            console.log('⚠️ Test owner not found, using first owner');
        }
        const ownerToUse = testOwner || owners[0];
        // Prepare schools data
        const schoolsData = [];
        // First, create 4 schools for the test owner
        for (let i = 0; i < 4; i++) {
            const randomManager = managers[Math.floor(Math.random() * managers.length)];
            schoolsData.push({
                name: `Test ${(0, seeder_utils_1.getRandomSchoolName)()} ${i + 1}`,
                address: `Test Mahallesi, ${Math.floor(Math.random() * 200) + 1}. Sokak No: ${Math.floor(Math.random() * 50) + 1}`,
                phone: (0, seeder_utils_1.generatePhoneNumber)(),
                mebbis_username: shared_1.TextEncryptor.mebbisUsernameEncrypt(`test_mebbis_user_${i + 1}`),
                mebbis_password: shared_1.TextEncryptor.mebbisPasswordEncrypt(`test_mebbis_pass_${i + 1}`),
                manager_id: randomManager.id,
                owner_id: ownerToUse.id
            });
        }
        // Then create additional schools for other owners
        for (let i = 4; i < 12; i++) {
            const randomOwner = owners[Math.floor(Math.random() * owners.length)];
            const randomManager = managers[Math.floor(Math.random() * managers.length)];
            schoolsData.push({
                name: (0, seeder_utils_1.getRandomSchoolName)(),
                address: `${(0, seeder_utils_1.getRandomName)()} Mahallesi, ${Math.floor(Math.random() * 200) + 1}. Sokak No: ${Math.floor(Math.random() * 50) + 1}`,
                phone: (0, seeder_utils_1.generatePhoneNumber)(),
                mebbis_username: shared_1.TextEncryptor.mebbisUsernameEncrypt(`mebbis_user_${i + 1}`),
                mebbis_password: shared_1.TextEncryptor.mebbisPasswordEncrypt(`mebbis_pass_${i + 1}`),
                manager_id: randomManager.id,
                owner_id: randomOwner.id
            });
        }
        // Bulk insert schools
        console.log(`🏫 Inserting ${schoolsData.length} schools in batch...`);
        await schoolRepository
            .createQueryBuilder()
            .insert()
            .into(shared_1.DrivingSchoolEntity)
            .values(schoolsData)
            .execute();
        // Get all schools
        const allSchools = await schoolRepository.find();
        // Prepare cars data
        const allCarsData = [];
        const usedPlates = new Set();
        for (const school of allSchools) {
            // Ensure each school gets at least 5 cars
            const carCount = Math.floor(Math.random() * 6) + 5; // 5-10 cars per school
            for (let i = 0; i < carCount; i++) {
                let plateNumber;
                let attempts = 0;
                // Ensure unique plate numbers
                do {
                    plateNumber = (0, seeder_utils_1.generatePlateNumber)();
                    attempts++;
                    if (attempts > 100) {
                        // If we can't generate a unique plate after 100 attempts, add a suffix
                        plateNumber = `${plateNumber.slice(0, -3)}${(Math.floor(Math.random() * 900) + 100).toString()}`;
                    }
                } while (usedPlates.has(plateNumber) && attempts < 100);
                usedPlates.add(plateNumber);
                allCarsData.push({
                    model: (0, seeder_utils_1.getRandomCarModel)(),
                    plate_number: plateNumber,
                    year: (0, seeder_utils_1.getRandomYear)(),
                    school_id: school.id
                });
            }
        }
        // Bulk insert cars
        console.log(`🚗 Inserting ${allCarsData.length} cars in batch...`);
        await carRepository
            .createQueryBuilder()
            .insert()
            .into(shared_1.DrivingSchoolCarEntity)
            .values(allCarsData)
            .execute();
        // Prepare students data
        const studentsData = [];
        const integrationInfoData = [];
        for (const school of allSchools) {
            const studentCount = Math.floor(Math.random() * 50) + 20;
            for (let i = 0; i < studentCount; i++) {
                const tcNumber = (0, seeder_utils_1.generateTcNumber)();
                studentsData.push({
                    name: (0, seeder_utils_1.getRandomName)(),
                    email: Math.random() > 0.3 ? `student${Date.now()}_${Math.random().toString(36).substring(7)}@example.com` : undefined,
                    phone: (0, seeder_utils_1.generatePhoneNumber)(),
                    tc_number: tcNumber,
                    school_id: school.id
                });
                // Prepare integration info
                integrationInfoData.push({
                    external_id: `EXT_${school.id}_${i + 1}`,
                    integration_data: JSON.stringify({
                        course_progress: Math.floor(Math.random() * 101),
                        last_exam_score: Math.floor(Math.random() * 41) + 60,
                        exam_attempts: Math.floor(Math.random() * 4) + 1,
                        practical_hours: Math.floor(Math.random() * 50) + 10,
                        theory_completed: Math.random() > 0.3
                    }),
                    tc_number: tcNumber
                });
            }
        }
        // Bulk insert students
        console.log(`👨‍🎓 Inserting ${studentsData.length} students in batch...`);
        await studentRepository
            .createQueryBuilder()
            .insert()
            .into(shared_1.DrivingSchoolStudentEntity)
            .values(studentsData)
            .execute();
        // Get created students
        const allStudents = await studentRepository.find();
        // Create map of TC to student ID
        const tcToStudentMap = new Map();
        allStudents.forEach(student => {
            tcToStudentMap.set(student.tc_number, student.id);
        });
        // Prepare integration info with student IDs
        const finalIntegrationData = [];
        for (const info of integrationInfoData) {
            const studentId = tcToStudentMap.get(info.tc_number);
            if (studentId) {
                finalIntegrationData.push({
                    external_id: info.external_id,
                    integration_data: info.integration_data,
                    student_id: studentId
                });
            }
        }
        // Bulk insert integration info
        if (finalIntegrationData.length > 0) {
            console.log(`📊 Inserting ${finalIntegrationData.length} integration records in batch...`);
            await integrationRepository
                .createQueryBuilder()
                .insert()
                .into(shared_1.DrivingSchoolStudentIntegrationInfoEntity)
                .values(finalIntegrationData)
                .execute();
        }
        console.log(`✅ Created ${allSchools.length} schools, ${allCarsData.length} cars, ${allStudents.length} students using batch inserts`);
    }
}
exports.SchoolsSeeder = SchoolsSeeder;
