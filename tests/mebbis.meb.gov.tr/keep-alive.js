/**
 * Keep-Alive Daemon - Automatic Multi-Session Keep-Alive
 * 
 * Automatically keeps ALL online MEBBIS sessions alive.
 * - Scans database for sessions with valid cookies
 * - Validates which sessions are online
 * - Keeps all online sessions alive by sending requests every 4 minutes (staggered)
 * - Re-scans database every 5 minutes to discover new logins
 * - Removes sessions that expire (e.g. logged in from another computer)
 * - Automatic retry with exponential backoff on connection errors
 * - No user interaction needed — fully automatic
 */

const mysql = require('mysql2/promise');
const https = require('https');

// ─── CONFIG ──────────────────────────────────────────────────
const KEEP_ALIVE_INTERVAL = 4 * 60 * 1000;   // 4 min — refresh interval per session
const DB_RESCAN_INTERVAL  = 5 * 60 * 1000;   // 5 min — check DB for new logins
const MAX_CONSECUTIVE_FAILURES = 3;           // remove session after 3 consecutive failures
const RETRY_DELAYS = [2000, 5000, 10000];    // retry delays in ms: 2s, 5s, 10s
// ─────────────────────────────────────────────────────────────

// Pages to cycle through for keep-alive requests
const menuLinks = [
  { url: '/SKT/skt01001.aspx', text: 'Kurum Bilgileri' },
  { url: '/SKT/skt01002.aspx', text: 'Kurum Arac Giris / Goruntuleme' },
  { url: '/SKT/skt01003.aspx', text: 'Kurum Derslik Giris / Goruntuleme' },
  { url: '/SKT/skt01005.aspx', text: 'Kurum Randevu Tanimlama Ekrani' },
  { url: '/SKT/skt02001.aspx', text: 'Aday Donem Kayit Islemleri' },
  { url: '/SKT/skt02002.aspx', text: 'Aday Fotograf Kayit' },
  { url: '/SKT/skt02003.aspx', text: 'Aday Ogrenim Bilgisi Kayit' },
  { url: '/SKT/skt02004.aspx', text: 'Aday Saglik Raporu Kayit' },
  { url: '/SKT/skt02005.aspx', text: 'Aday Sabika Kayit' },
  { url: '/SKT/SKT02010.aspx', text: 'Aday Imza Kayit' },
  { url: '/SKT/skt02006.aspx', text: 'Donem Adaylarini Onaylama' },
  { url: '/SKT/skt02007.aspx', text: 'e-Sinav Basvuru Islemleri' },
  { url: '/SKT/skt02008.aspx', text: 'Sinav Sonuc Listeleme' },
  { url: '/SKT/skt02009.aspx', text: 'Aday Durum Goruntuleme' },
  { url: '/SKT/skt02011.aspx', text: 'Aday Sozlesme Bilgisi Kayit' },
  { url: '/SKT/SKT02012.aspx', text: 'Aday Adres Beyan' },
  { url: '/SKT/skt02013.aspx', text: 'Aday Fatura Kayit' },
  { url: '/SKT/skt03001.aspx', text: 'Donem Grup Acilis Tarihi Giris' },
  { url: '/SKT/skt03002.aspx', text: 'Grup Sube Tanimlama' },
  { url: '/SKT/skt03003.aspx', text: 'Teorik Ders Programi Giris' },
  { url: '/SKT/skt03004.aspx', text: 'Direksiyon Egitimi Ders Programi Giris' },
  { url: '/SKT/skt04001.aspx', text: 'Teorik Ders Programi Goruntuleme' },
  { url: '/SKT/skt04002.aspx', text: 'Direksiyon Ders Programi Goruntuleme' },
  { url: '/SKT/skt04003.aspx', text: 'Sinav Bilgileri Goruntuleme' }
];

// ─── STATE ───────────────────────────────────────────────────
// Map<tbmebbis_id, { user, pageIndex, failureCount, timer }>
const activeSessions = new Map();
// ─────────────────────────────────────────────────────────────

function getDbConfig() {
  return {
    host: 'localhost',
    port: 3306,
    user: 'mtsk_rapor',
    password: 'ua_mV2922',
    database: 'mtsk_rapor',
    connectTimeout: 10000,
    timezone: '+03:00'
  };
}

function ts() {
  return new Date().toLocaleTimeString('tr-TR');
}

function log(msg) {
  console.log(`[${ts()}] ${msg}`);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── HTTP ────────────────────────────────────────────────────

function extractHeaderInfo(html) {
  const userRegex = /<span id="SktPageHeader1_lblKullaniciAdi">([^<]+)<\/span>/i;
  const institutionRegex = /<span id="SktPageHeader1_lblKurumKodu">([^<]+)<\/span>/i;
  const activeUsersRegex = /<span id="SktPageHeader1_lblAktifKullaniciSayisi">([^<]*)<\/span>/i;

  const userMatch = html.match(userRegex);
  const institutionMatch = html.match(institutionRegex);
  const activeUsersMatch = html.match(activeUsersRegex);

  return {
    found: !!(userMatch && institutionMatch),
    userId: userMatch ? userMatch[1].trim() : null,
    institution: institutionMatch ? institutionMatch[1].trim() : null,
    activeUsers: activeUsersMatch ? activeUsersMatch[1].trim() : 'N/A'
  };
}

function fetchPage(cookieString, pagePath = '/SKT/skt01001.aspx') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'mebbisyd.meb.gov.tr',
      path: pagePath,
      method: 'GET',
      headers: {
        'Cookie': cookieString,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    };

    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });

    req.on('error', (e) => reject(e));
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

// ─── DATABASE ────────────────────────────────────────────────

async function fetchSessionsFromDb() {
  const dbConfig = getDbConfig();
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let [rows] = await connection.query(`
      SELECT * FROM tb_mebbis_view 
      WHERE lastLoginH >= ? AND cookie IS NOT NULL AND cookie != ''
      ORDER BY lastLogin DESC
    `, [today]);

    // Fallback: if nothing today, get last 20
    if (rows.length === 0) {
      [rows] = await connection.query(`
        SELECT * FROM tb_mebbis_view 
        WHERE cookie IS NOT NULL AND cookie != ''
        ORDER BY lastLogin DESC
        LIMIT 20
      `);
    }

    return rows;
  } finally {
    if (connection) await connection.end();
  }
}

// ─── SESSION VALIDATION ──────────────────────────────────────

async function validateSession(user) {
  if (!user.cookie) return { ...user, online: false };

  try {
    const response = await fetchPage(user.cookie);
    const headerInfo = extractHeaderInfo(response.body);

    if (headerInfo.found && response.statusCode === 200) {
      return {
        ...user,
        online: true,
        mebbisUser: headerInfo.userId,
        mebbisInstitution: headerInfo.institution,
      };
    }
    return { ...user, online: false };
  } catch {
    return { ...user, online: false };
  }
}

// ─── UPDATE LAST ACTIVITY ───────────────────────────────────

async function updateLastActivity(tbmebbisId) {
  const dbConfig = getDbConfig();
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    
    // 10-digit Unix timestamp (seconds, not milliseconds)
    const timestamp = Math.floor(Date.now() / 1000);
    
    await connection.query(
      'UPDATE tb_mebbis SET lastActivity = ? WHERE id = ?',
      [timestamp, tbmebbisId]
    );
  } catch (error) {
    log(`  Warning: Failed to update lastActivity for ${tbmebbisId}: ${error.message}`);
  } finally {
    if (connection) await connection.end();
  }
}

// ─── KEEP-ALIVE PING ────────────────────────────────────────

async function pingSessionWithRetry(sessionId, retryCount = 0) {
  const entry = activeSessions.get(sessionId);
  if (!entry) return;

  const { user } = entry;
  const page = menuLinks[entry.pageIndex % menuLinks.length];
  entry.pageIndex++;

  const name = user.tbmebbisadi || user.mail || user.adi || sessionId;

  try {
    const response = await fetchPage(user.cookie, page.url);
    const headerInfo = extractHeaderInfo(response.body);

    if (headerInfo.found && response.statusCode === 200) {
      entry.failureCount = 0;
      log(`  OK ${name} — ${page.url}`);
      // Update last activity in database
      await updateLastActivity(sessionId);
      // Reschedule for next ping
      scheduleSessionPing(sessionId);
    } else {
      entry.failureCount++;
      log(`  FAIL ${name} — ${page.url} (${entry.failureCount}/${MAX_CONSECUTIVE_FAILURES})`);

      if (entry.failureCount >= MAX_CONSECUTIVE_FAILURES) {
        clearTimer(sessionId);
        activeSessions.delete(sessionId);
        log(`  REMOVED ${name} — session expired or logged in elsewhere`);
      } else {
        // Reschedule with stagger
        scheduleSessionPing(sessionId);
      }
    }
  } catch (error) {
    const isConnectionError = error.code === 'ECONNRESET' || 
                             error.code === 'ECONNREFUSED' || 
                             error.code === 'ETIMEDOUT' ||
                             error.message.includes('read ECONNRESET');

    if (isConnectionError && retryCount < RETRY_DELAYS.length) {
      // Retry on connection errors with exponential backoff
      const delay = RETRY_DELAYS[retryCount];
      log(`  RETRY ${name} — ${error.code} (attempt ${retryCount + 1}/${RETRY_DELAYS.length}) in ${delay}ms`);
      
      setTimeout(() => {
        pingSessionWithRetry(sessionId, retryCount + 1);
      }, delay);
    } else if (retryCount >= RETRY_DELAYS.length) {
      // Max retries exceeded
      entry.failureCount++;
      log(`  FAIL ${name} — ${error.message || error.code} (${entry.failureCount}/${MAX_CONSECUTIVE_FAILURES}) [max retries exceeded]`);

      if (entry.failureCount >= MAX_CONSECUTIVE_FAILURES) {
        clearTimer(sessionId);
        activeSessions.delete(sessionId);
        log(`  REMOVED ${name} — too many errors`);
      } else {
        // Reschedule with stagger
        scheduleSessionPing(sessionId);
      }
    } else {
      // Non-connection error
      entry.failureCount++;
      log(`  FAIL ${name} — ${error.message || error.code} (${entry.failureCount}/${MAX_CONSECUTIVE_FAILURES})`);

      if (entry.failureCount >= MAX_CONSECUTIVE_FAILURES) {
        clearTimer(sessionId);
        activeSessions.delete(sessionId);
        log(`  REMOVED ${name} — too many errors`);
      } else {
        // Reschedule with stagger
        scheduleSessionPing(sessionId);
      }
    }
  }
}

// Schedule a session ping with random offset to spread requests
function scheduleSessionPing(sessionId) {
  const entry = activeSessions.get(sessionId);
  if (!entry) return;

  // Clear existing timer if any
  if (entry.timer) clearTimeout(entry.timer);

  // Random offset between 0 and 4 minutes to spread requests throughout the window
  const randomOffset = Math.random() * KEEP_ALIVE_INTERVAL;

  entry.timer = setTimeout(() => {
    pingSessionWithRetry(sessionId, 0);
  }, randomOffset);
}

// Clear timer for a session
function clearTimer(sessionId) {
  const entry = activeSessions.get(sessionId);
  if (entry && entry.timer) {
    clearTimeout(entry.timer);
    entry.timer = null;
  }
}

// ─── DB RESCAN ───────────────────────────────────────────────

async function rescanDatabase() {
  log('Scanning database for sessions...');

  let dbSessions;
  try {
    dbSessions = await fetchSessionsFromDb();
  } catch (error) {
    log(`DB scan failed: ${error.message}`);
    return;
  }

  log(`Found ${dbSessions.length} session(s) in DB`);

  let added = 0;
  let alreadyTracked = 0;
  let cookieUpdated = 0;
  let removedInvalid = 0;

  for (const dbUser of dbSessions) {
    const id = dbUser.tbmebbis_id;
    const name = dbUser.tbmebbisadi || dbUser.mail || dbUser.adi || id;

    const existing = activeSessions.get(id);

    if (existing) {
      // Check if cookie changed (user re-logged in => new cookie)
      if (existing.user.cookie !== dbUser.cookie) {
        const result = await validateSession(dbUser);
        if (result.online) {
          existing.user = result;
          existing.failureCount = 0;
          // Reschedule with new stagger
          scheduleSessionPing(id);
          cookieUpdated++;
          log(`  UPDATED ${name} — cookie changed (re-login detected)`);
        } else {
          clearTimer(id);
          activeSessions.delete(id);
          removedInvalid++;
          log(`  REMOVED ${name} — new cookie already invalid`);
        }
      } else {
        alreadyTracked++;
      }
      await delay(300);
      continue;
    }

    // New session — validate it
    const result = await validateSession(dbUser);
    await delay(300);

    if (result.online) {
      const entry = {
        user: result,
        pageIndex: 0,
        failureCount: 0,
        timer: null
      };
      activeSessions.set(id, entry);
      // Schedule first ping with stagger
      scheduleSessionPing(id);
      added++;
      log(`  ADDED ${name}`);
    }
  }

  if (added || cookieUpdated || removedInvalid) {
    log(`Scan result: +${added} new, ${cookieUpdated} updated, -${removedInvalid} removed, ${alreadyTracked} unchanged`);
  }
  log(`Active sessions: ${activeSessions.size}`);
}

// ─── STATUS DISPLAY ──────────────────────────────────────────

function printStatus() {
  console.log('\n' + '='.repeat(70));
  console.log(`  KEEP-ALIVE STATUS | ${new Date().toLocaleString('tr-TR')}`);
  console.log('='.repeat(70));

  if (activeSessions.size === 0) {
    console.log('  No active sessions');
  } else {
    let i = 1;
    for (const [id, entry] of activeSessions) {
      const name = entry.user.tbmebbisadi || entry.user.mail || entry.user.adi || id;
      const inst = entry.user.mebbisInstitution?.substring(0, 45) || 'N/A';
      const fails = entry.failureCount > 0 ? ` (fails: ${entry.failureCount})` : '';
      console.log(`  ${i}. ${name}`);
      console.log(`     ${inst}${fails}`);
      i++;
    }
  }

  console.log('='.repeat(70));
  console.log(`  Session refresh: every ${KEEP_ALIVE_INTERVAL / 1000}s with staggered timing`);
  console.log(`  Retry strategy: ${RETRY_DELAYS.length} retries with (${RETRY_DELAYS.map(d => d / 1000 + 's').join(', ')}) backoff`);
  console.log(`  DB rescan every ${DB_RESCAN_INTERVAL / 1000}s`);
  console.log(`  Updates lastActivity column on successful pings`);
  console.log('  Press Ctrl+C to stop');
  console.log('='.repeat(70) + '\n');
}

// ─── MAIN ────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('  MEBBIS KEEP-ALIVE DAEMON');
  console.log('  Automatically keeps all online sessions alive');
  console.log('  Sessions scheduled with staggered timing to avoid throttling');
  console.log('='.repeat(70) + '\n');

  // Initial scan — find all online sessions
  await rescanDatabase();
  printStatus();

  // DB Rescan loop — discover new/changed sessions every DB_RESCAN_INTERVAL
  const rescanTimer = setInterval(async () => {
    await rescanDatabase();
    printStatus();
  }, DB_RESCAN_INTERVAL);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n');
    log('Shutting down...');
    clearInterval(rescanTimer);
    
    // Clear all session timers
    for (const [sessionId] of activeSessions) {
      clearTimer(sessionId);
    }
    
    log(`Was keeping ${activeSessions.size} session(s) alive`);
    log('Goodbye!');
    process.exit(0);
  });

  // Keep process running
  await new Promise(() => {});
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
