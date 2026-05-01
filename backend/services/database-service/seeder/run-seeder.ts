import 'reflect-metadata';
import { dataSource } from '../data-source';
import { MainSeeder } from './main.seeder';

async function runSeeder() {
  try {
    console.log('🔄 Initializing database connection...');
    
    // Check if already initialized
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    
    console.log('✅ Database connected');

    const mainSeeder = new MainSeeder();
    await mainSeeder.run(dataSource);

    await dataSource.destroy();
    console.log('👋 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running seeder:', error);
    process.exit(1);
  }
}

runSeeder();
