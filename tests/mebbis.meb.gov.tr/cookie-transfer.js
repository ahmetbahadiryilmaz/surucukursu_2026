/**
 * Cookie Transfer — Copy alive MEBBIS session from old system to new system
 *
 * Interactive flow:
 *   1. Scans old system (mtsk_rapor → tb_mebbis_view) for alive sessions
 *   2. You pick which old-system session (source cookie) to use
 *   3. Lists driving schools under test@surucukursu.com in the new system
 *   4. You pick which new-system school (target) receives the cookie
 *   5. Validates + writes the cookie into driving_school_cookies
 *
 * Usage:
 *   node cookie-transfer.js
 */

const mysql = require('mysql2/promise');
const https = require('https');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// ─── ENV / DB ────────────────────────────────────────────────

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '..', 'backend', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('Backend .env file not found at:', envPath);
    process.exit(1);
  }
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const vars = {};
  envContent.split('\n').forEach(line => {
    const t = line.trim();
    if (t && !t.startsWith('#')) {
      const [key, ...rest] = t.split('=');
      if (key && rest.length) vars[key.trim()] = rest.join('=').trim();
    }
  });
  return vars;
}

function newDbConfig() {
  const e = loadEnvFile();
  return {
    host: e.DB_HOST, port: +(e.DB_PORT || 3306),
    user: e.DB_USERNAME, password: e.DB_PASSWORD,
    database: e.DB_NAME || 'mtsk_surucukursu',
    connectTimeout: 10000, timezone: '+03:00',
  };
}

function oldDbConfig() {
  // Use backend .env credentials but mtsk_rapor database
  const e = loadEnvFile();
  return {
    host: e.DB_HOST, port: +(e.DB_PORT || 3306),
    user: e.DB_USERNAME, password: e.DB_PASSWORD,
    database: 'mtsk_rapor',
    connectTimeout: 10000, timezone: '+03:00',
  };
}

// ─── READLINE PROMPT ─────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

// ─── UTILS ───────────────────────────────────────────────────

const ts = () => new Date().toLocaleTimeString('tr-TR');
const log = msg => console.log(`[${ts()}] ${msg}`);
const delay = ms => new Promise(r => setTimeout(r, ms));

// ─── HTTP — MEBBIS VALIDATION ────────────────────────────────

function fetchMebbisPage(cookieString, pagePath = '/SKT/skt01001.aspx') {
  return new Promise((resolve, reject) => {
    const req = https.get({
      hostname: 'mebbisyd.meb.gov.tr',
      path: pagePath,
      headers: {
        Cookie: cookieString,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Encoding': 'identity',
      },
      timeout: 15000,
    }, res => {
      let d = '';
      res.on('data', c => { d += c; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function extractHeaderInfo(html) {
  const kisi = html.match(/<span id="ModulPageHeader1_lblKisi">([^<]+)<\/span>/i);
  const user = html.match(/<span id="SktPageHeader1_lblKullaniciAdi">([^<]+)<\/span>/i);
  const inst = html.match(/<span id="SktPageHeader1_lblKurumKodu">([^<]+)<\/span>/i);
  return {
    found: !!(kisi || (user && inst)),
    kisi: kisi?.[1]?.trim() ?? null,
    userId: user?.[1]?.trim() ?? null,
    institution: inst?.[1]?.trim() ?? null,
  };
}

async function checkSessionAlive(cookieString) {
  try {
    // Try main page first
    let res = await fetchMebbisPage(cookieString, '/main.aspx?ntk=1');
    let info = extractHeaderInfo(res.body);
    if (info.found && res.statusCode === 200) return { alive: true, ...info };

    // Fallback: SKT page
    res = await fetchMebbisPage(cookieString, '/SKT/skt01001.aspx');
    info = extractHeaderInfo(res.body);
    if (info.found && res.statusCode === 200) return { alive: true, ...info };

    return { alive: false, reason: 'Session expired or invalid' };
  } catch (e) {
    return { alive: false, reason: e.message };
  }
}

// ─── COOKIE FILE HELPERS ─────────────────────────────────────

function readOldCookieFile(tbMebbisId) {
  const base = path.join(__dirname, '..', '..', 'backend', 'old-mebbis-service', 'storage', 'cookies');
  const candidates = [
    path.join(base, `mebbis${tbMebbisId}.txt`),
    path.join(base, `mebbis${tbMebbisId}.txt.netscape.txt`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8').trim();
      if (content) return { content, isNetscape: p.includes('.netscape.') };
    }
  }
  return null;
}

function netscapeToCookieString(raw) {
  return raw.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(l => {
      const p = l.split('\t');
      return p.length >= 7 ? `${p[5]}=${p[6]}` : null;
    })
    .filter(Boolean)
    .join('; ');
}

function cookieStringFor(tbMebbisId) {
  const f = readOldCookieFile(tbMebbisId);
  if (!f) return null;
  return f.isNetscape ? netscapeToCookieString(f.content) : f.content;
}

// ═════════════════════════════════════════════════════════════
//  STEP 1 — Scan old system for alive sessions
// ═════════════════════════════════════════════════════════════

/**
 * Scan cookie files from old system storage
 */
function listOldCookieFiles() {
  const dir = path.join(__dirname, '..', '..', 'backend', 'old-mebbis-service', 'storage', 'cookies');
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir);
  const entries = [];

  for (const f of files) {
    const match = f.match(/^mebbis(\d+)\.txt$/);
    if (!match) continue;

    const id = parseInt(match[1]);
    const plainPath = path.join(dir, f);
    const netscapePath = path.join(dir, `mebbis${id}.txt.netscape.txt`);

    const stat = fs.statSync(plainPath);

    const plainContent = fs.readFileSync(plainPath, 'utf-8').trim();
    let cookieStr = plainContent;

    // If plain file looks like netscape format or is empty, try netscape file
    if (!cookieStr || cookieStr.startsWith('#')) {
      if (fs.existsSync(netscapePath)) {
        const nc = fs.readFileSync(netscapePath, 'utf-8').trim();
        cookieStr = netscapeToCookieString(nc);
      }
    }

    if (cookieStr) {
      entries.push({ tbmebbis_id: id, cookie: cookieStr, source: 'file', mtime: stat.mtime });
    }
  }

  // Sort by most recently modified first, take only last 10
  entries.sort((a, b) => b.mtime - a.mtime);
  return entries.slice(0, 10);
}

async function pickSourceSession() {
  console.log('\n' + '═'.repeat(70));
  console.log('  STEP 1 — Pick a source cookie (check alive sessions)');
  console.log('═'.repeat(70));

  let sessions = [];

  // ── Source: Old system DB (mtsk_rapor → tb_mebbis) ──
  let oldConn;
  try {
    log('Connecting to old system DB (mtsk_rapor)...');
    const oldConfig = oldDbConfig();
    log(`Old DB config: host=${oldConfig.host}, db=${oldConfig.database}`);
    oldConn = await mysql.createConnection(oldConfig);

    const [rows] = await oldConn.query(`
      SELECT * FROM tb_mebbis
      WHERE cookie IS NOT NULL AND cookie != ''
      ORDER BY lastLogin DESC
      LIMIT 10
    `);

    for (const r of rows) {
      sessions.push({
        tbmebbis_id: r.id,
        name: `ID:${r.id}`,
        cookie: r.cookie,
        lastLogin: r.lastLogin,
        source: 'old-db',
      });
    }

    if (rows.length > 0) log(`Found ${rows.length} session(s) in old system (tb_mebbis).`);
    await oldConn.end();
  } catch (e) {
    log(`Old DB not reachable: ${e.message || e}. Falling back to cookie files...`);
    if (oldConn) try { await oldConn.end(); } catch {}
    
    // Fallback to old cookie files
    const fileSessions = listOldCookieFiles();
    if (fileSessions.length > 0) {
      log(`Found ${fileSessions.length} cookie file(s) in old storage.`);
      for (const f of fileSessions) {
        sessions.push({
          ...f,
          name: `mebbis${f.tbmebbis_id}`,
          source: 'old-files',
        });
      }
    }
  }

  // ── Source 3: Old cookie files (fallback) ──
  if (sessions.length === 0) {
    const fileSessions = listOldCookieFiles();
    if (fileSessions.length > 0) {
      log(`Found ${fileSessions.length} cookie file(s) in old storage (fallback).`);
      sessions = fileSessions.map(f => ({
        ...f,
        name: `mebbis${f.tbmebbis_id}`,
      }));
    }
  }

  if (sessions.length === 0) {
    log('No sessions found anywhere.');
    return null;
  }

  log(`Checking ${sessions.length} session(s) for alive status...\n`);

  const alive = [];

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    process.stdout.write(`  [${i + 1}/${sessions.length}] ${s.name} (ID: ${s.tbmebbis_id}) ... `);

    const result = await checkSessionAlive(s.cookie);
    await delay(400);

    if (result.alive) {
      console.log(`✅ ALIVE — ${result.kisi || result.userId || ''}`);
      alive.push({ ...s, ...result });
    } else {
      console.log(`❌ dead`);
    }
  }

  if (alive.length === 0) {
    log('No alive sessions found.');
    return null;
  }

  // Display alive sessions for picking
  console.log('\n' + '─'.repeat(70));
  console.log('  Alive sessions:');
  console.log('─'.repeat(70));

  for (let i = 0; i < alive.length; i++) {
    const s = alive[i];
    const inst = s.institution ? ` | ${s.institution}` : '';
    const kisiInfo = s.kisi ? ` | ${s.kisi}` : '';
    const src = ` [${s.source}]`;
    console.log(`  [${i + 1}] ID: ${s.tbmebbis_id} — ${s.name}${kisiInfo}${inst}${src}`);
  }

  console.log('─'.repeat(70));

  const choice = await ask(`\n  Pick source session [1-${alive.length}]: `);
  const idx = parseInt(choice) - 1;

  if (isNaN(idx) || idx < 0 || idx >= alive.length) {
    log('Invalid choice.');
    return null;
  }

  const picked = alive[idx];
  const pickedName = picked.name || `ID:${picked.tbmebbis_id}`;
  log(`Selected: ${pickedName} (tbMebbisId: ${picked.tbmebbis_id})`);

  return picked; // has .cookie .tbmebbis_id etc.
}

// ═════════════════════════════════════════════════════════════
//  STEP 2 — Pick target school under test@surucukursu.com
// ═════════════════════════════════════════════════════════════

async function pickTargetSchool() {
  console.log('\n' + '═'.repeat(70));
  console.log('  STEP 2 — Pick a target school (new system — test@surucukursu.com)');
  console.log('═'.repeat(70));

  let newConn;
  try {
    log('Connecting to new system DB (mtsk_surucukursu)...');
    newConn = await mysql.createConnection(newDbConfig());
    log('Connected.');

    // Find the owner/manager with test@surucukursu.com
    const [owners] = await newConn.query(
      `SELECT id, name, email FROM driving_school_owners WHERE email = 'test@surucukursu.com' LIMIT 1`
    );
    const [managers] = await newConn.query(
      `SELECT id, name, email FROM driving_school_managers WHERE email = 'test@surucukursu.com' LIMIT 1`
    );

    let schools = [];

    if (owners.length > 0) {
      log(`Found owner: ${owners[0].name} (${owners[0].email}), ID: ${owners[0].id}`);
      const [rows] = await newConn.query(
        `SELECT ds.id, ds.name, ds.phone, ds.mebbis_username, ds.address,
                dsc.cookie_data IS NOT NULL AS has_cookie,
                dsc.is_valid,
                dsc.updated_at AS cookie_updated
         FROM driving_schools ds
         LEFT JOIN driving_school_cookies dsc ON dsc.driving_school_id = ds.id
         WHERE ds.owner_id = ?
         ORDER BY ds.id`,
        [owners[0].id]
      );
      schools.push(...rows);
    }

    if (managers.length > 0) {
      log(`Found manager: ${managers[0].name} (${managers[0].email}), ID: ${managers[0].id}`);
      const [rows] = await newConn.query(
        `SELECT ds.id, ds.name, ds.phone, ds.mebbis_username, ds.address,
                dsc.cookie_data IS NOT NULL AS has_cookie,
                dsc.is_valid,
                dsc.updated_at AS cookie_updated
         FROM driving_schools ds
         LEFT JOIN driving_school_cookies dsc ON dsc.driving_school_id = ds.id
         WHERE ds.manager_id = ?
         ORDER BY ds.id`,
        [managers[0].id]
      );
      // Deduplicate if same school linked as both owner and manager
      for (const r of rows) {
        if (!schools.find(s => s.id === r.id)) schools.push(r);
      }
    }

    // If no test@ user found, also try searching all schools
    if (schools.length === 0 && owners.length === 0 && managers.length === 0) {
      log('test@surucukursu.com not found as owner or manager.');
      log('Listing all driving schools instead...');
      const [rows] = await newConn.query(
        `SELECT ds.id, ds.name, ds.phone, ds.mebbis_username, ds.address,
                dsc.cookie_data IS NOT NULL AS has_cookie,
                dsc.is_valid,
                dsc.updated_at AS cookie_updated
         FROM driving_schools ds
         LEFT JOIN driving_school_cookies dsc ON dsc.driving_school_id = ds.id
         ORDER BY ds.id`
      );
      schools = rows;
    }

    if (schools.length === 0) {
      log('No driving schools found.');
      await newConn.end();
      return { school: null, connection: null };
    }

    // Display schools
    console.log('\n' + '─'.repeat(70));
    console.log('  Driving schools under test@surucukursu.com:');
    console.log('─'.repeat(70));

    for (let i = 0; i < schools.length; i++) {
      const s = schools[i];
      const cookieStatus = s.has_cookie
        ? (s.is_valid ? '🟢 valid cookie' : '🟡 invalid cookie')
        : '⚪ no cookie';
      const updated = s.cookie_updated
        ? ` (updated: ${new Date(s.cookie_updated).toLocaleString('tr-TR')})`
        : '';
      const mebbisUser = s.mebbis_username ? ` | MEBBIS: ${s.mebbis_username}` : '';

      console.log(`  [${i + 1}] ID: ${s.id} — ${s.name}${mebbisUser}`);
      console.log(`       ${cookieStatus}${updated}`);
    }

    console.log('─'.repeat(70));

    const choice = await ask(`\n  Pick target school [1-${schools.length}]: `);
    const idx = parseInt(choice) - 1;

    if (isNaN(idx) || idx < 0 || idx >= schools.length) {
      log('Invalid choice.');
      await newConn.end();
      return { school: null, connection: null };
    }

    const picked = schools[idx];
    log(`Selected: ${picked.name} (ID: ${picked.id})`);

    return { school: picked, connection: newConn };
  } catch (e) {
    console.error('New system error:', e.message);
    if (newConn) await newConn.end();
    return { school: null, connection: null };
  }
}

// ═════════════════════════════════════════════════════════════
//  STEP 3 — Transfer cookie
// ═════════════════════════════════════════════════════════════

async function transferCookie(source, target, newConn) {
  console.log('\n' + '═'.repeat(70));
  console.log('  STEP 3 — Transfer & validate cookie');
  console.log('═'.repeat(70));

  const sourceName = source.tbmebbisadi || source.adi || source.mail || `ID:${source.tbmebbis_id}`;
  const cookieStr = source.cookie;

  log(`Source: ${sourceName} (tbMebbisId: ${source.tbmebbis_id})`);
  log(`Target: ${target.name} (ID: ${target.id})`);
  log('Validating source cookie is still alive...');

  const check = await checkSessionAlive(cookieStr);

  if (!check.alive) {
    log(`❌ Source cookie is no longer alive: ${check.reason}`);
    log('Transfer aborted. The source session may have expired.');
    return false;
  }

  log(`✅ Cookie still alive — ${check.kisi || check.userId || 'OK'}`);

  // Upsert into driving_school_cookies
  const [existing] = await newConn.query(
    'SELECT id FROM driving_school_cookies WHERE driving_school_id = ?',
    [target.id]
  );

  if (existing.length > 0) {
    await newConn.query(
      'UPDATE driving_school_cookies SET cookie_data = ?, is_valid = 1, updated_at = NOW() WHERE driving_school_id = ?',
      [cookieStr, target.id]
    );
    log('Updated existing cookie row.');
  } else {
    await newConn.query(
      'INSERT INTO driving_school_cookies (driving_school_id, cookie_data, is_valid, created_at, updated_at) VALUES (?, ?, 1, NOW(), NOW())',
      [target.id, cookieStr]
    );
    log('Inserted new cookie row.');
  }

  // Also update tb_mebbis if a row exists
  const [tbRow] = await newConn.query('SELECT id FROM tb_mebbis WHERE id = ?', [target.id]);
  if (tbRow.length > 0) {
    await newConn.query(
      'UPDATE tb_mebbis SET cookie = ?, mebbislogin = 1, lastLogin = UNIX_TIMESTAMP() WHERE id = ?',
      [cookieStr, target.id]
    );
    log('Updated tb_mebbis record.');
  } else {
    await newConn.query(
      'INSERT INTO tb_mebbis (id, cookie, mebbislogin, lastLogin) VALUES (?, ?, 1, UNIX_TIMESTAMP())',
      [target.id, cookieStr]
    );
    log('Created tb_mebbis record.');    
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`  ✅ DONE  —  Cookie transferred successfully!`);
  console.log(`  Source:  ${sourceName}  (old system tbMebbisId ${source.tbmebbis_id})`);
  console.log(`  Target:  ${target.name}  (new system school ID ${target.id})`);
  console.log('═'.repeat(70) + '\n');

  return true;
}

// ─── MAIN ────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('  MEBBIS COOKIE TRANSFER');
  console.log('  Old system (mtsk_rapor)  →  New system (driving_school_cookies)');
  console.log('═'.repeat(70));

  // Step 1 — pick source
  const source = await pickSourceSession();
  if (!source) {
    log('No source session selected. Exiting.');
    rl.close();
    process.exit(0);
  }

  // Step 2 — pick target
  const { school: target, connection: newConn } = await pickTargetSchool();
  if (!target || !newConn) {
    log('No target school selected. Exiting.');
    rl.close();
    process.exit(0);
  }

  // Step 3 — transfer
  const ok = await transferCookie(source, target, newConn);

  await newConn.end();
  rl.close();

  process.exit(ok ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal:', err);
  rl.close();
  process.exit(1);
});
