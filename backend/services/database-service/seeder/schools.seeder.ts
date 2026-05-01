/**
 * Schools, Cars, and Students Seeder
 */

import { Seeder } from '@jorgebodega/typeorm-seeding';
import { DataSource } from 'typeorm';
import {
  DrivingSchoolEntity,
  DrivingSchoolCarEntity,
  DrivingSchoolStudentEntity,
  DrivingSchoolStudentIntegrationInfoEntity,
  DrivingSchoolOwnerEntity,
  DrivingSchoolManagerEntity,
  TextEncryptor
} from '@surucukursu/shared';
import {
  getRandomSchoolName,
  getRandomName,
  generatePhoneNumber,
  getRandomCarModel,
  generatePlateNumber,
  getRandomYear,
  generateTcNumber
} from './seeder.utils';

export class SchoolsSeeder extends Seeder {
  async run(dataSource: DataSource): Promise<void> {
    console.log('🏫 Seeding schools with cars and students...');

    const schoolRepository = dataSource.getRepository(DrivingSchoolEntity);
    const carRepository = dataSource.getRepository(DrivingSchoolCarEntity);
    const studentRepository = dataSource.getRepository(DrivingSchoolStudentEntity);
    const integrationRepository = dataSource.getRepository(DrivingSchoolStudentIntegrationInfoEntity);
    const ownerRepository = dataSource.getRepository(DrivingSchoolOwnerEntity);
    const managerRepository = dataSource.getRepository(DrivingSchoolManagerEntity);

    // Get all owners and managers
    const owners = await ownerRepository.find();
    const managers = await managerRepository.find();

    if (owners.length === 0 || managers.length === 0) {
      console.log('⚠️ No owners or managers found, skipping schools seeding');
      return;
    }

    // Find the test owner
    const testOwner = owners.find(owner => owner.email === 'test@surucukursu.com');
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
        name: `Test ${getRandomSchoolName()} ${i + 1}`,
        address: `Test Mahallesi, ${Math.floor(Math.random() * 200) + 1}. Sokak No: ${Math.floor(Math.random() * 50) + 1}`,
        phone: generatePhoneNumber(),
        mebbis_username: TextEncryptor.mebbisUsernameEncrypt(`test_mebbis_user_${i + 1}`),
        mebbis_password: TextEncryptor.mebbisPasswordEncrypt(`test_mebbis_pass_${i + 1}`),
        manager_id: randomManager.id,
        owner_id: ownerToUse.id
      });
    }

    // Then create additional schools for other owners
    for (let i = 4; i < 12; i++) {
      const randomOwner = owners[Math.floor(Math.random() * owners.length)];
      const randomManager = managers[Math.floor(Math.random() * managers.length)];

      schoolsData.push({
        name: getRandomSchoolName(),
        address: `${getRandomName()} Mahallesi, ${Math.floor(Math.random() * 200) + 1}. Sokak No: ${Math.floor(Math.random() * 50) + 1}`,
        phone: generatePhoneNumber(),
        mebbis_username: TextEncryptor.mebbisUsernameEncrypt(`mebbis_user_${i + 1}`),
        mebbis_password: TextEncryptor.mebbisPasswordEncrypt(`mebbis_pass_${i + 1}`),
        manager_id: randomManager.id,
        owner_id: randomOwner.id
      });
    }

    // Bulk insert schools
    console.log(`🏫 Inserting ${schoolsData.length} schools in batch...`);
    await schoolRepository
      .createQueryBuilder()
      .insert()
      .into(DrivingSchoolEntity)
      .values(schoolsData)
      .execute();

    // Get all schools
    const allSchools = await schoolRepository.find();

    // Prepare cars data
    const allCarsData = [];
    const usedPlates = new Set<string>();

    for (const school of allSchools) {
      // Ensure each school gets at least 5 cars
      const carCount = Math.floor(Math.random() * 6) + 5; // 5-10 cars per school
      for (let i = 0; i < carCount; i++) {
        let plateNumber;
        let attempts = 0;
        // Ensure unique plate numbers
        do {
          plateNumber = generatePlateNumber();
          attempts++;
          if (attempts > 100) {
            // If we can't generate a unique plate after 100 attempts, add a suffix
            plateNumber = `${plateNumber.slice(0, -3)}${(Math.floor(Math.random() * 900) + 100).toString()}`;
          }
        } while (usedPlates.has(plateNumber) && attempts < 100);

        usedPlates.add(plateNumber);

        allCarsData.push({
          model: getRandomCarModel(),
          plate_number: plateNumber,
          year: getRandomYear(),
          school_id: school.id
        });
      }
    }

    // Bulk insert cars
    console.log(`🚗 Inserting ${allCarsData.length} cars in batch...`);
    await carRepository
      .createQueryBuilder()
      .insert()
      .into(DrivingSchoolCarEntity)
      .values(allCarsData)
      .execute();

    // Prepare students data
    const studentsData = [];
    const integrationInfoData = [];

    for (const school of allSchools) {
      const studentCount = Math.floor(Math.random() * 50) + 20;
      for (let i = 0; i < studentCount; i++) {
        const tcNumber = generateTcNumber();
        studentsData.push({
          name: getRandomName(),
          email: Math.random() > 0.3 ? `student${Date.now()}_${Math.random().toString(36).substring(7)}@example.com` : undefined,
          phone: generatePhoneNumber(),
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
      .into(DrivingSchoolStudentEntity)
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
        .into(DrivingSchoolStudentIntegrationInfoEntity)
        .values(finalIntegrationData)
        .execute();
    }

    console.log(`✅ Created ${allSchools.length} schools, ${allCarsData.length} cars, ${allStudents.length} students using batch inserts`);
  }
}