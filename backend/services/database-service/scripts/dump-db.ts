import 'reflect-metadata';
import { config } from 'dotenv';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// .env lives at backend/.env (one level above services/<svc>/scripts/).
config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

/**
 * Pre-migration safety dump. Streams mysqldump to a timestamped file under
 * backend/storage/db-dumps/. Run automatically by `pnpm migrate` and
 * `pnpm migrate:fresh` before any schema change.
 *
 * Skipped when:
 *   SKIP_DB_DUMP=1     — explicit opt-out (CI, throwaway dev DBs)
 *   --skip-dump flag   — same, via CLI
 *   mysqldump not on PATH — logs a warning, continues. The migration may
 *                          still proceed; the operator gets visibility.
 */

interface DbConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

function resolveConfig(): DbConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
  };
}

function shouldSkip(): boolean {
  if (process.env.SKIP_DB_DUMP === '1' || process.env.SKIP_DB_DUMP === 'true') return true;
  if (process.argv.includes('--skip-dump')) return true;
  return false;
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function resolveDumpDir(): string {
  // backend/services/database-service/scripts → ../../../storage/db-dumps
  const dir = path.resolve(__dirname, '..', '..', '..', 'storage', 'db-dumps');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function pruneOldDumps(dir: string, keep = 30) {
  try {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.sql') || f.endsWith('.sql.gz'))
      .map((f) => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    for (const { f } of files.slice(keep)) {
      fs.unlinkSync(path.join(dir, f));
      console.log(`[dump-db] Pruned old dump: ${f}`);
    }
  } catch (e) {
    console.warn('[dump-db] Prune failed (non-fatal):', e);
  }
}

async function runDump(): Promise<void> {
  if (shouldSkip()) {
    console.log('[dump-db] SKIP_DB_DUMP set — skipping pre-migration dump');
    return;
  }

  const cfg = resolveConfig();
  if (!cfg.database) {
    console.warn('[dump-db] DB_NAME not set — skipping dump');
    return;
  }

  const dir = resolveDumpDir();
  const reason = process.env.DUMP_REASON || 'manual';
  const file = path.join(dir, `${timestamp()}_${reason}_${cfg.database}.sql`);

  // Use --result-file when available so password warnings on stderr don't
  // pollute stdout/the file. Pass password via env (MYSQL_PWD) — that keeps
  // it out of the process arg list (no leak in `ps`).
  const args = [
    '-h', cfg.host,
    '-P', String(cfg.port),
    '-u', cfg.username,
    '--single-transaction',
    '--quick',
    '--routines',
    '--triggers',
    '--events',
    '--default-character-set=utf8mb4',
    `--result-file=${file}`,
    cfg.database,
  ];

  console.log(`[dump-db] Dumping ${cfg.database}@${cfg.host}:${cfg.port} → ${path.relative(process.cwd(), file)}`);

  await new Promise<void>((resolve, reject) => {
    const child = spawn('mysqldump', args, {
      env: { ...process.env, MYSQL_PWD: cfg.password },
      stdio: ['ignore', 'inherit', 'pipe'],
      shell: false,
    });
    let stderrBuf = '';
    child.stderr?.on('data', (chunk) => { stderrBuf += chunk.toString(); });
    child.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        console.warn('[dump-db] mysqldump not on PATH — skipping (install MySQL client or set SKIP_DB_DUMP=1)');
        resolve();
        return;
      }
      reject(err);
    });
    child.on('close', (code) => {
      if (code !== 0) {
        // Strip the "Using a password on the command line is insecure" warning
        // since we're using MYSQL_PWD, not --password.
        const filtered = stderrBuf
          .split(/\r?\n/)
          .filter((l) => l && !/Using a password on the command line/i.test(l))
          .join('\n');
        if (filtered) console.error('[dump-db] mysqldump stderr:\n' + filtered);
        reject(new Error(`mysqldump exited with code ${code}`));
        return;
      }
      try {
        const size = fs.statSync(file).size;
        console.log(`[dump-db] ✓ Dump complete (${(size / 1024).toFixed(1)} KB)`);
      } catch {
        /* file already gone */
      }
      pruneOldDumps(dir);
      resolve();
    });
  });
}

runDump()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[dump-db] Dump failed:', err?.message || err);
    // Block the migration if the user asked for a dump and it errored.
    // To override, set SKIP_DB_DUMP=1 explicitly.
    process.exit(1);
  });
