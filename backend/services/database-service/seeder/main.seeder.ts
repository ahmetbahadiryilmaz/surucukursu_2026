import { Seeder } from '@jorgebodega/typeorm-seeding';
import { DataSource } from 'typeorm';
import { CitiesSeeder } from './cities.seeder';
import { UsersSeeder } from './users.seeder';
import { SessionsSeeder } from './sessions.seeder';
import { SchoolsSeeder } from './schools.seeder';
import { SubscriptionsSeeder } from './subscriptions.seeder';
import { LogsSeeder } from './logs.seeder';
import { JobsSeeder } from './jobs.seeder';

export class MainSeeder extends Seeder {
  async run(dataSource: DataSource): Promise<void> {
    console.log('🌱 Starting database seeding with batch inserts...');
    const startTime = Date.now();

    // Run seeders in order
    const citiesSeeder = new CitiesSeeder();
    await citiesSeeder.run(dataSource);

    const usersSeeder = new UsersSeeder();
    await usersSeeder.run(dataSource);

    const sessionsSeeder = new SessionsSeeder();
    await sessionsSeeder.run(dataSource);

    const schoolsSeeder = new SchoolsSeeder();
    await schoolsSeeder.run(dataSource);

    const subscriptionsSeeder = new SubscriptionsSeeder();
    await subscriptionsSeeder.run(dataSource);

    const jobsSeeder = new JobsSeeder();
    await jobsSeeder.run(dataSource);

    const logsSeeder = new LogsSeeder();
    await logsSeeder.run(dataSource);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`✅ Database seeding completed in ${duration}s using batch inserts!`);
  }
}