/**
 * System Logs Seeder
 */

import { Seeder } from '@jorgebodega/typeorm-seeding';
import { DataSource } from 'typeorm';
import {
  SystemLogsEntity,
  AdminEntity,
  DrivingSchoolOwnerEntity,
  DrivingSchoolManagerEntity
} from '@surucukursu/shared';

enum UserTypes {
  ADMIN = 1,
  DRIVING_SCHOOL_OWNER = 2,
  DRIVING_SCHOOL_MANAGER = 3
}

enum SystemLogProcessTypes {
  LOGIN = 1,
  LOGOUT = 2,
  PASSWORD_CHANGE = 3,
  PROFILE_UPDATE = 4,
  SCHOOL_CREATE = 5,
  SCHOOL_UPDATE = 6,
  STUDENT_CREATE = 7,
  STUDENT_UPDATE = 8,
  CAR_CREATE = 9,
  CAR_UPDATE = 10
}

export class LogsSeeder extends Seeder {
  async run(dataSource: DataSource): Promise<void> {
    console.log('📋 Creating system logs...');

    const logsRepository = dataSource.getRepository(SystemLogsEntity);
    const adminRepository = dataSource.getRepository(AdminEntity);
    const ownerRepository = dataSource.getRepository(DrivingSchoolOwnerEntity);
    const managerRepository = dataSource.getRepository(DrivingSchoolManagerEntity);

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

    const processTypeValues = Object.values(SystemLogProcessTypes).filter(value => typeof value === 'number') as number[];

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
      .into(SystemLogsEntity)
      .values(systemLogsData)
      .execute();

    console.log('✅ Created 100 system log entries using batch insert');
  }
}