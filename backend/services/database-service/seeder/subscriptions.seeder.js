"use strict";
/**
 * Subscriptions Seeder
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsSeeder = void 0;
const typeorm_seeding_1 = require("@jorgebodega/typeorm-seeding");
const shared_1 = require("@surucukursu/shared");
class SubscriptionsSeeder extends typeorm_seeding_1.Seeder {
    async run(dataSource) {
        console.log('📋 Creating subscriptions for each school...');
        const subscriptionRepository = dataSource.getRepository(shared_1.SubscriptionEntity);
        const schoolRepository = dataSource.getRepository(shared_1.DrivingSchoolEntity);
        // Get all schools
        const schools = await schoolRepository.find();
        if (schools.length === 0) {
            console.log('⚠️ No schools found, skipping subscriptions seeding');
            return;
        }
        const subscriptionsData = [];
        for (const school of schools) {
            // 60% demo, 40% unlimited distribution
            const isDemo = Math.random() < 0.6;
            const pdfUsed = isDemo ? Math.floor(Math.random() * 8) : Math.floor(Math.random() * 25); // Demo: 0-7 used, Unlimited: 0-24 used
            subscriptionsData.push({
                driving_school_id: school.id,
                type: isDemo ? 'demo' : 'unlimited',
                pdf_print_limit: isDemo ? 10 : undefined,
                pdf_print_used: pdfUsed
            });
        }
        // Bulk insert subscriptions
        console.log(`📋 Inserting ${subscriptionsData.length} subscriptions in batch...`);
        await subscriptionRepository
            .createQueryBuilder()
            .insert()
            .into(shared_1.SubscriptionEntity)
            .values(subscriptionsData)
            .execute();
        console.log(`✅ Created ${subscriptionsData.length} subscriptions using batch insert`);
    }
}
exports.SubscriptionsSeeder = SubscriptionsSeeder;
