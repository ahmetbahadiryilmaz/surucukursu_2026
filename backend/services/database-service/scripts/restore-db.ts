import 'reflect-metadata';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as mysql from 'mysql2/promise';

config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

/**
 * Replay a SQL dump file (produced by dump-db-js.ts or mysqldump) into the
 * configured database. Splits statements on `;\n` boundaries and executes
 * them sequentially.
 *
 * Usage:
 *   pnpm --filter=@surucukursu/database-service restore:db -- <path-to-dump.sql>
 */

async function run() {
  const file = process.argv[2] || process.argv[process.argv.length - 1];
  if (!file || !file.endsWith('.sql')) {
    console.error('Usage: restore-db <path-to-dump.sql>');
    process.exit(2);
  }
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(2);
  }

  const cfg = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
  };
  if (!cfg.database) {
    console.error('DB_NAME not set in env');
    process.exit(2);
  }

  console.log(`[restore] Reading ${file}`);
  const sql = fs.readFileSync(file, 'utf8');
  console.log(`[restore] File size: ${(sql.length / 1024).toFixed(1)} KB`);
  console.log(`[restore] Target: ${cfg.database}@${cfg.host}:${cfg.port}`);

  // Split: statements end with `;` at end of line. Keep multi-line CREATE TABLE
  // and INSERT … VALUES (…),(…); intact. Strip lines that are only comments.
  const statements: string[] = [];
  let buf = '';
  for (const lineRaw of sql.split(/\r?\n/)) {
    const line = lineRaw;
    // Skip empty / comment-only lines (but keep them inside multi-line statements)
    if (!buf && (line.trim() === '' || line.trimStart().startsWith('--'))) continue;
    buf += line + '\n';
    if (line.trimEnd().endsWith(';')) {
      const stmt = buf.trim();
      if (stmt && stmt !== ';') statements.push(stmt);
      buf = '';
    }
  }
  if (buf.trim()) statements.push(buf.trim());
  console.log(`[restore] Parsed ${statements.length} statements`);

  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    multipleStatements: false,
  });

  try {
    let executed = 0;
    let lastTable = '';
    for (const stmt of statements) {
      const m = stmt.match(/^(?:CREATE TABLE|DROP TABLE IF EXISTS|INSERT INTO)\s+`([^`]+)`/i);
      if (m && m[1] !== lastTable) {
        lastTable = m[1];
        process.stdout.write(`\n[restore] ▸ ${lastTable}`);
      }
      try {
        await conn.query(stmt);
        executed++;
        process.stdout.write('.');
      } catch (e: any) {
        process.stdout.write('\n');
        console.error(`[restore] FAIL on ${lastTable || '(meta)'}: ${e.code || e.message}`);
        console.error(`           ${stmt.slice(0, 200)}${stmt.length > 200 ? '…' : ''}`);
        throw e;
      }
    }
    process.stdout.write('\n');
    console.log(`[restore] ✓ ${executed}/${statements.length} statements applied successfully`);
  } finally {
    await conn.end();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[restore] failed:', err?.message || err);
    process.exit(1);
  });
