"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const data_source_1 = require("../data-source");
const main_seeder_1 = require("./main.seeder");
async function runSeeder() {
    try {
        console.log('🔄 Initializing database connection...');
        // Check if already initialized
        if (!data_source_1.dataSource.isInitialized) {
            await data_source_1.dataSource.initialize();
        }
        console.log('✅ Database connected');
        const mainSeeder = new main_seeder_1.MainSeeder();
        await mainSeeder.run(data_source_1.dataSource);
        await data_source_1.dataSource.destroy();
        console.log('👋 Database connection closed');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error running seeder:', error);
        process.exit(1);
    }
}
runSeeder();
