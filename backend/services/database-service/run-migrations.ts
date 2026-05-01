import 'reflect-metadata';
import { dataSource } from './data-source';

async function run() {
  try {
    await dataSource.initialize();
    console.log('DataSource initialized');
    const result = await dataSource.runMigrations();
    console.log('Migrations result:', result);
    await dataSource.destroy();
  } catch (err) {
    console.error('Migration run failed:', err);
    process.exit(1);
  }
}

run();