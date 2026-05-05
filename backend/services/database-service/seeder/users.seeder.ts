/**
 * Users Seeder
 */

import { Seeder } from '@jorgebodega/typeorm-seeding';
import { DataSource } from 'typeorm';
import {
  AdminEntity,
  DrivingSchoolOwnerEntity,
  DrivingSchoolManagerEntity,
  TextEncryptor
} from '@surucukursu/shared';
import { getRandomName, generatePhoneNumber } from './seeder.utils';

export class UsersSeeder extends Seeder {
  async run(dataSource: DataSource): Promise<void> {
    console.log('👥 Seeding users...');

    const adminRepository = dataSource.getRepository(AdminEntity);
    const ownerRepository = dataSource.getRepository(DrivingSchoolOwnerEntity);
    const managerRepository = dataSource.getRepository(DrivingSchoolManagerEntity);

    // Prepare all admins data (including test admin)
    const adminsData = [
      {
        name: 'Test Admin',
        email: 'test@admin.com',
        password: TextEncryptor.userPasswordEncrypt('test@admin.com'),
      }
    ];

    for (let i = 0; i < 3; i++) {
      adminsData.push({
        name: getRandomName(),
        email: `admin${i + 1}@mtsk.app`,
        password: TextEncryptor.userPasswordEncrypt(`admin${i + 1}@mtsk.app`),
      });
    }

    // Bulk insert all admins
    console.log(`👤 Inserting ${adminsData.length} admins in batch...`);
    await adminRepository
      .createQueryBuilder()
      .insert()
      .into(AdminEntity)
      .values(adminsData)
      .execute();

    // Prepare owners data (including test owner)
    const ownersData = [
      {
        name: 'Test Sürücü Kursu Sahibi',
        email: 'test@mtsk.app',
        password: TextEncryptor.userPasswordEncrypt('test@mtsk.app'),
        phone: generatePhoneNumber()
      }
    ];

    for (let i = 0; i < 10; i++) {
      ownersData.push({
        name: getRandomName(),
        email: `owner${i + 1}@mtsk.app`,
        password: TextEncryptor.userPasswordEncrypt(`owner${i + 1}@mtsk.app`),
        phone: generatePhoneNumber()
      });
    }

    // Bulk insert owners
    console.log(`👥 Inserting ${ownersData.length} owners in batch...`);
    await ownerRepository
      .createQueryBuilder()
      .insert()
      .into(DrivingSchoolOwnerEntity)
      .values(ownersData)
      .execute();

    // Prepare managers data
    const managersData = [];
    for (let i = 0; i < 15; i++) {
      managersData.push({
        name: getRandomName(),
        email: `manager${i + 1}@mtsk.app`,
        password: TextEncryptor.userPasswordEncrypt(`manager${i + 1}@mtsk.app`),
        phone: generatePhoneNumber()
      });
    }

    // Bulk insert managers
    console.log(`👔 Inserting ${managersData.length} managers in batch...`);
    await managerRepository
      .createQueryBuilder()
      .insert()
      .into(DrivingSchoolManagerEntity)
      .values(managersData)
      .execute();

    console.log(`✅ Created ${adminsData.length} admins, ${ownersData.length} owners, ${managersData.length} managers using batch inserts`);
  }
}