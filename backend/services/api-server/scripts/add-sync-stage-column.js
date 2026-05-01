"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dotenv_1 = require("dotenv");
const path = require("path");
(0, dotenv_1.config)({ path: path.join(__dirname, '../../../.env') });
const AppDataSource = new typeorm_1.DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sürücü_kursu',
    synchronize: false,
    logging: false,
});
async function main() {
    try {
        await AppDataSource.initialize();
        console.log('✅ Connected to database');
        const result = await AppDataSource.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'jobs' AND COLUMN_NAME = 'sync_stage' AND TABLE_SCHEMA = ?`, [process.env.DB_NAME]);
        if (result.length > 0) {
            console.log('✅ Column sync_stage already exists');
            process.exit(0);
        }
        console.log('📝 Adding sync_stage column to jobs table...');
        await AppDataSource.query(`ALTER TABLE jobs ADD COLUMN sync_stage VARCHAR(255) NULL DEFAULT NULL AFTER status`);
        console.log('✅ Successfully added sync_stage column');
        const columns = await AppDataSource.query(`SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'jobs' AND TABLE_SCHEMA = ?`, [process.env.DB_NAME]);
        console.log('\n📊 Current jobs table columns:');
        columns.forEach((col) => {
            console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
        });
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=add-sync-stage-column.js.map