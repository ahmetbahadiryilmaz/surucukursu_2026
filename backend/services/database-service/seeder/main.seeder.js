"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MainSeeder = void 0;
const typeorm_seeding_1 = require("@jorgebodega/typeorm-seeding");
const cities_seeder_1 = require("./cities.seeder");
const users_seeder_1 = require("./users.seeder");
const sessions_seeder_1 = require("./sessions.seeder");
const schools_seeder_1 = require("./schools.seeder");
const subscriptions_seeder_1 = require("./subscriptions.seeder");
const logs_seeder_1 = require("./logs.seeder");
const jobs_seeder_1 = require("./jobs.seeder");
class MainSeeder extends typeorm_seeding_1.Seeder {
    async run(dataSource) {
        console.log('🌱 Starting database seeding with batch inserts...');
        const startTime = Date.now();
        // Run seeders in order
        const citiesSeeder = new cities_seeder_1.CitiesSeeder();
        await citiesSeeder.run(dataSource);
        const usersSeeder = new users_seeder_1.UsersSeeder();
        await usersSeeder.run(dataSource);
        const sessionsSeeder = new sessions_seeder_1.SessionsSeeder();
        await sessionsSeeder.run(dataSource);
        const schoolsSeeder = new schools_seeder_1.SchoolsSeeder();
        await schoolsSeeder.run(dataSource);
        const subscriptionsSeeder = new subscriptions_seeder_1.SubscriptionsSeeder();
        await subscriptionsSeeder.run(dataSource);
        const jobsSeeder = new jobs_seeder_1.JobsSeeder();
        await jobsSeeder.run(dataSource);
        const logsSeeder = new logs_seeder_1.LogsSeeder();
        await logsSeeder.run(dataSource);
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`✅ Database seeding completed in ${duration}s using batch inserts!`);
    }
}
exports.MainSeeder = MainSeeder;
