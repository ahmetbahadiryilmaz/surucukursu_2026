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
        const query = `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'driving_school_students' AND TABLE_SCHEMA = ?`;
        const columns = await AppDataSource.query(query, [process.env.DB_NAME]);
        console.log('\n📊 Columns in driving_school_students table:');
        columns.forEach((col) => {
            console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (nullable: ${col.IS_NULLABLE})`);
        });
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=check-columns.js.map