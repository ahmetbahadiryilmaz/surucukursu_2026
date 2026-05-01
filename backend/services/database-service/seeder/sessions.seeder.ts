/**
 * Sessions Seeder
 */

import { Seeder } from '@jorgebodega/typeorm-seeding';
import { DataSource } from 'typeorm';
import {
  SessionEntity,
  AdminEntity,
  DrivingSchoolOwnerEntity,
  DrivingSchoolManagerEntity
} from '@surucukursu/shared';

enum UserTypes {
  ADMIN = 1,
  DRIVING_SCHOOL_OWNER = 2,
  DRIVING_SCHOOL_MANAGER = 3
}

export class SessionsSeeder extends Seeder {
  async run(dataSource: DataSource): Promise<void> {
    console.log('🔐 Creating active sessions...');

    const sessionRepository = dataSource.getRepository(SessionEntity);
    const adminRepository = dataSource.getRepository(AdminEntity);
    const ownerRepository = dataSource.getRepository(DrivingSchoolOwnerEntity);
    const managerRepository = dataSource.getRepository(DrivingSchoolManagerEntity);

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
      .into(SessionEntity)
      .values(sessionsData)
      .execute();

    console.log(`✅ Created ${sessionsData.length} active sessions using batch insert`);
  }
}