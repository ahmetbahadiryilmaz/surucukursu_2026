/**
 * Session Keep-Alive - Maintain MEBBIS Session
 * 1. Reads session cookie from database or file
 * 2. Sends periodic requests to checking page every 30 seconds
 * 3. Keeps session alive and prevents timeout
 * 4. Logs activity and session status
 */

const mysql = require('mysql2/promise');
const https = require('https');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Ensure directories exist
const logsDir = path.join(__dirname, 'logs');
[logsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create logger
function createLogger(sessionName) {
  const logPath = path.join(logsDir, `keep-alive_${sessionName}_${Date.now()}.log`);
  
  return {
    log: (message) => {
      const timestamp = new Date().toLocaleString('tr-TR');
      const logMessage = `[${timestamp}] ${message}`;
      console.log(logMessage);
      fs.appendFileSync(logPath, logMessage + '\n');
    },
    error: (message) => {
      const timestamp = new Date().toLocaleString('tr-TR');
      const logMessage = `[${timestamp}] ❌ ERROR: ${message}`;
      console.error(logMessage);
      fs.appendFileSync(logPath, logMessage + '\n');
    }
  };
}

// Load environment variables from backend .env
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '..', 'backend', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.error('Backend .env file not found at:', envPath);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return envVars;
}

// Extract header info from HTML to check if session is valid
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

// Fetch a page with given cookies and path
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
      timeout: 10000
    };

    const req = https.get(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Check session validity
async function checkSessionValidity(cookie, logger) {
  try {
    const response = await fetchPage(cookie);
    const headerInfo = extractHeaderInfo(response.body);

    if (headerInfo.found) {
      logger.log(`✅ Session valid | User: ${headerInfo.userId} | Institution: ${headerInfo.institution?.substring(0, 40)}`);
      return { valid: true, headerInfo };
    } else {
      logger.error('Session expired - user might be forcefully logged out');
      return { valid: false, headerInfo: null };
    }
  } catch (error) {
    logger.error(`Failed to check session: ${error.message}`);
    return { valid: false, headerInfo: null };
  }
}

// Keep-alive loop - send request every 30 seconds
async function keepAliveLoop(cookie, sessionInfo, logger) {
  let requestCount = 0;
  let failureCount = 0;
  const maxFailures = 5; // Stop after 5 consecutive failures

  logger.log('========================================');
  logger.log('SESSION KEEP-ALIVE STARTED');
  logger.log('========================================');
  logger.log(`Session: ${sessionInfo.sessionName || sessionInfo.tbmebbisadi}`);
  logger.log(`User: ${sessionInfo.mebbisUser}`);
  logger.log(`Interval: 30 seconds`);
  logger.log('----------------------------------------');

  // Send initial check
  const initialCheck = await checkSessionValidity(cookie, logger);
  
  if (!initialCheck.valid) {
    logger.error('Initial session check failed. Session might already be expired.');
    return;
  }

  // Keep-alive interval - every 30 seconds
  const keepAliveInterval = setInterval(async () => {
    requestCount++;
    
    try {
      const result = await checkSessionValidity(cookie, logger);
      
      if (result.valid) {
        failureCount = 0; // Reset failure counter on success
        logger.log(`[Request #${requestCount}] Session check successful`);
      } else {
        failureCount++;
        logger.error(`[Request #${requestCount}] Session invalid (Failure ${failureCount}/${maxFailures})`);
        
        if (failureCount >= maxFailures) {
          logger.error(`Max failures reached. Stopping keep-alive.`);
          clearInterval(keepAliveInterval);
        }
      }
    } catch (error) {
      failureCount++;
      logger.error(`[Request #${requestCount}] Error: ${error.message} (Failure ${failureCount}/${maxFailures})`);
      
      if (failureCount >= maxFailures) {
        logger.error(`Max failures reached. Stopping keep-alive.`);
        clearInterval(keepAliveInterval);
      }
    }
  }, 30000); // 30 seconds

  // Allow graceful shutdown on Ctrl+C
  process.on('SIGINT', () => {
    logger.log('\n========================================');
    logger.log('KEEP-ALIVE STOPPED - User requested exit');
    logger.log('Total Requests:', requestCount);
    logger.log('========================================');
    clearInterval(keepAliveInterval);
    process.exit(0);
  });
}

// Get user sessions from database
async function getAvailableSessions() {
  const env = loadEnvFile();

  const dbConfig = {
    host: env.DB_HOST,
    port: parseInt(env.DB_PORT) || 3306,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: 'mtsk_rapor',
    connectTimeout: 10000,
    timezone: '+03:00'
  };

  console.log('\n========================================');
  console.log('  KEEP-ALIVE - Session Manager');
  console.log('========================================');
  console.log('Connecting to database...');

  let connection;
  const sessions = [];

  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ Connected to database\n');

    // Get users who logged in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [todayUsers] = await connection.query(`
      SELECT * FROM tb_mebbis_view 
      WHERE lastLoginH >= ? AND cookie IS NOT NULL AND cookie != ''
      ORDER BY lastLogin DESC
    `, [today]);

    console.log(`Found ${todayUsers.length} users with active sessions today.\n`);

    return todayUsers;

  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Display session selection menu
function displaySessionMenu(sessions) {
  console.log('=' .repeat(80));
  console.log('AVAILABLE SESSIONS');
  console.log('='.repeat(80));
  
  if (sessions.length === 0) {
    console.log('\n❌ No sessions found.');
    return;
  }

  sessions.forEach((session, index) => {
    const loginTime = session.lastLoginH ? new Date(session.lastLoginH).toLocaleTimeString('tr-TR') : 'N/A';
    console.log(`\n${index + 1}. ${session.tbmebbisadi || session.mail}`);
    console.log(`   User: ${session.adi} | Institution: ${session.kurumkodu?.substring(0, 50)}`);
    console.log(`   Last Login: ${loginTime}`);
  });
  
  console.log('\n' + '='.repeat(80));
}

// Main function
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  try {
    // Get available sessions
    const sessions = await getAvailableSessions();

    if (sessions.length === 0) {
      console.log('\n❌ No sessions available. Exiting.');
      rl.close();
      return;
    }

    // Display and select session
    displaySessionMenu(sessions);
    
    const sessionInput = await question('\nSelect session (1-' + sessions.length + ') or "exit" to quit: ');
    
    if (sessionInput.toLowerCase() === 'exit') {
      console.log('\nGoodbye!');
      rl.close();
      return;
    }

    const sessionNum = parseInt(sessionInput);
    if (isNaN(sessionNum) || sessionNum < 1 || sessionNum > sessions.length) {
      console.log('\n❌ Invalid selection.');
      rl.close();
      return;
    }

    const selectedSession = sessions[sessionNum - 1];
    console.log(`\n✓ Selected: ${selectedSession.tbmebbisadi || selectedSession.mail}`);

    // Create logger for this session
    const sessionName = (selectedSession.tbmebbisadi || selectedSession.mail).replace(/[^a-zA-Z0-9]/g, '_');
    const logger = createLogger(sessionName);

    // Get session header info before starting keep-alive
    console.log('\nValidating session before starting keep-alive...');
    
    try {
      const response = await fetchPage(selectedSession.cookie);
      const headerInfo = extractHeaderInfo(response.body);

      if (!headerInfo.found) {
        console.log('\n❌ Session validation failed. Session might already be expired.');
        rl.close();
        return;
      }

      // Start keep-alive loop
      rl.close();
      console.log(`✓ Session validated. Starting keep-alive with 30-second interval...`);
      console.log(`Press Ctrl+C to stop.\n`);

      await keepAliveLoop(selectedSession.cookie, {
        ...selectedSession,
        ...headerInfo,
        sessionName
      }, logger);

    } catch (error) {
      console.log(`\n❌ Error validating session: ${error.message}`);
      rl.close();
      return;
    }

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    rl.close();
  }
}

main();
