"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const data_source_1 = require("./data-source");
async function run() {
    try {
        await data_source_1.dataSource.initialize();
        console.log('DataSource initialized');
        const result = await data_source_1.dataSource.runMigrations();
        console.log('Migrations result:', result);
        await data_source_1.dataSource.destroy();
    }
    catch (err) {
        console.error('Migration run failed:', err);
        process.exit(1);
    }
}
run();
