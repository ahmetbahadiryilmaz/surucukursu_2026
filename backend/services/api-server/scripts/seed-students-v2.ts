import { DataSource } from 'typeorm';
import {
  DrivingSchoolStudentEntity,
  DrivingSchoolEntity,
  DrivingSchoolCarEntity,
  DrivingSchoolSettingsEntity,
  DrivingSchoolOwnerEntity,
  DrivingSchoolManagerEntity,
  CityEntity,
  DistrictEntity,
  SubscriptionEntity,
  DrivingSchoolStudentIntegrationInfoEntity,
  SystemLogsEntity,
} from '@surucukursu/shared';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '../../../.env') });

// Database connection configuration
const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sürücü_kursu',
  entities: [
    DrivingSchoolStudentEntity,
    DrivingSchoolEntity,
    DrivingSchoolCarEntity,
    DrivingSchoolSettingsEntity,
    DrivingSchoolOwnerEntity,
    DrivingSchoolManagerEntity,
    CityEntity,
    DistrictEntity,
    SubscriptionEntity,
    DrivingSchoolStudentIntegrationInfoEntity,
    SystemLogsEntity,
  ],
  synchronize: false,
  logging: false,
});

const turkishFirstNames = [
  'Ahmet', 'Mehmet', 'Ali', 'Mustafa', 'Hasan', 'Fatih', 'Emre', 'Cem', 'Kerem', 'Özgür',
  'Ayşe', 'Fatma', 'Zeynep', 'Elif', 'Emine', 'Gül', 'Seda', 'Nursun', 'Diane', 'Ebru',
];

const turkishLastNames = [
  'Yılmaz', 'Kaya', 'Demir', 'Aydın', 'Ürün', 'Çelik', 'Gül', 'Sözer', 'Kılıç', 'Türk',
  'Öztürk', 'Sayan', 'Güzel', 'Aktaş', 'Bülent', 'Çağlar', 'Deniz', 'Eroğlu', 'Filiz', 'Görür',
];

function generateTCNumber(): string {
  let tc = '';
  for (let i = 0; i < 11; i++) {
    tc += Math.floor(Math.random() * 10);
  }
  return tc;
}

async function main() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    const schoolRepository = AppDataSource.getRepository(DrivingSchoolEntity);
    const dogusSchool = await schoolRepository.findOne({
      where: { name: 'Doğuş Sürücü Kursu' },
    });

    if (!dogusSchool) {
      console.error('❌ Driving school "Doğuş Sürücü Kursu" not found');
      console.log('\n📋 Available driving schools:');
      const allSchools = await schoolRepository.find();
      allSchools.forEach((school) => {
        console.log(`  - ${school.name} (ID: ${school.id})`);
      });
      process.exit(1);
    }

    console.log(`✅ Found driving school: "${dogusSchool.name}" (ID: ${dogusSchool.id})`);

    // Generate students
    const students = [];
    const usedTCs = new Set<string>();

    for (let i = 0; i < 15; i++) {
      let tc = generateTCNumber();
      while (usedTCs.has(tc)) {
        tc = generateTCNumber();
      }
      usedTCs.add(tc);

      const firstName = turkishFirstNames[Math.floor(Math.random() * turkishFirstNames.length)];
      const lastName = turkishLastNames[Math.floor(Math.random() * turkishLastNames.length)];

      const studentData = {
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
        phone: `0${Math.floor(Math.random() * 9) + 1}${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
        tc_number: tc,
        school_id: dogusSchool.id,
      };

      students.push(studentData);
    }

    console.log(`📝 Generated ${students.length} fake students`);

    // Insert students using raw query to avoid entity validation
    const studentRepository = AppDataSource.getRepository(DrivingSchoolStudentEntity);
    const now = Math.floor(Date.now() / 1000);
    
    for (const student of students) {
      await studentRepository.query(
        `INSERT INTO driving_school_students (name, email, phone, tc_number, school_id, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [student.name, student.email, student.phone, student.tc_number, student.school_id, now, now]
      );
    }
    
    console.log(`✅ Successfully inserted ${students.length} students`);

    // Display inserted students
    console.log('\n📊 Inserted students:');
    const insertedStudents = await studentRepository.query(
      `SELECT id, name, tc_number FROM driving_school_students WHERE school_id = ? ORDER BY created_at DESC LIMIT 15`,
      [dogusSchool.id]
    );
    insertedStudents.forEach((student) => {
      console.log(`  - ${student.name} (TC: ${student.tc_number})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
