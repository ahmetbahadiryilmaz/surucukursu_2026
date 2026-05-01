/**
 * Jobs Seeder
 */

import { Seeder } from '@jorgebodega/typeorm-seeding';
import { DataSource } from 'typeorm';
import { JobEntity, JobStatus, JobType, DrivingSchoolEntity } from '@surucukursu/shared';

export class JobsSeeder extends Seeder {
  async run(dataSource: DataSource): Promise<void> {
    console.log('💼 Seeding jobs...');

    const jobRepository = dataSource.getRepository(JobEntity);
    const schoolRepository = dataSource.getRepository(DrivingSchoolEntity);

    // Get all schools
    const schools = await schoolRepository.find();

    if (schools.length === 0) {
      console.log('⚠️ No schools found, skipping jobs seeding');
      return;
    }

    // Prepare jobs data
    const jobsData = [];

    // Job types to randomly assign
    const jobTypes = [
      JobType.SINGLE_SIMULATION,
      JobType.GROUP_SIMULATION,
      JobType.SINGLE_DIREKSIYON_TAKIP,
      JobType.GROUP_DIREKSIYON_TAKIP
    ];

    // Create completed jobs for each school
    for (const school of schools) {
      // Create 5-15 completed jobs per school
      const jobCount = Math.floor(Math.random() * 11) + 5;

      for (let i = 0; i < jobCount; i++) {
        const jobType = jobTypes[Math.floor(Math.random() * jobTypes.length)];
        
        // Random completion time within last 7 days (as Unix timestamp in seconds)
        const completedAt = Math.floor((Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) / 1000);

        jobsData.push({
          type: jobType,
          status: JobStatus.COMPLETED,
          progress_percentage: 100,
          school_id: school.id,
          completed_at: completedAt,
        });
      }
    }

    // Bulk insert jobs
    console.log(`💼 Inserting ${jobsData.length} completed jobs in batch...`);
    await jobRepository
      .createQueryBuilder()
      .insert()
      .into(JobEntity)
      .values(jobsData)
      .execute();

    console.log(`✅ Created ${jobsData.length} completed jobs using batch inserts`);
  }
}