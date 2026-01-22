import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables FIRST before any other imports
// Handle both dev mode (__dirname = src) and prod mode (__dirname = dist/mebbis-service)
let envPath: string;

// Try multiple possible locations for .env file
const possiblePaths = [
  path.resolve(__dirname, '../../.env'),                    // prod: dist/mebbis-service/../../.env
  path.resolve(__dirname, '../../../.env'),                 // dev: src/../../../.env
  path.resolve(process.cwd(), '.env'),                      // current working directory
  path.resolve(process.cwd(), 'backend/.env'),              // from root: backend/.env
];

for (const tryPath of possiblePaths) {
  if (fs.existsSync(tryPath)) {
    envPath = tryPath;
    break;
  }
}

if (envPath) {
  const result = config({ path: envPath });
  if (result.error) {
    console.warn('Warning: Could not parse .env file:', result.error.message);
  }
} else {
  console.warn('Warning: .env file not found in any expected location');
}

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('Starting MEBBIS Service...');
  
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  
  const port = process.env.MEBBIS_SERVICE_PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 MEBBIS Service is running on: http://localhost:${port}`);
}
bootstrap();
