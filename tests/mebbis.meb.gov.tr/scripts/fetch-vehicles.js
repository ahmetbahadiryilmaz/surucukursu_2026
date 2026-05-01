const https = require('https');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const mysql = require('mysql2/promise');

// Load environment variables from .env file (SAME AS SESSION-PICKER)
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '..', '..', 'backend', '.env');
  
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

// Get session from database using ID (SAME AS SESSION-PICKER)
async function getSessionById(id) {
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

  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ Connected to database (mtsk_rapor)');
    
    // Query tb_mebbis by ID
    const [rows] = await connection.query(`
      SELECT * FROM tb_mebbis 
      WHERE id = ?
    `, [id]);
    
    if (rows.length === 0) {
      console.error(`❌ No session found with id ${id}`);
      process.exit(1);
    }
    
    const session = rows[0];
    console.log(`✓ Found session: ${session.adi}`);
    console.log(`  Cookie: ${session.cookie.length} bytes\n`);
    
    return session;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Extract hidden form inputs from HTML (SAME AS SESSION-PICKER)
function extractFormFields(html) {
  const fields = {};
  const inputRegex = /<input[^>]*>/gi;

  let match;
  while ((match = inputRegex.exec(html)) !== null) {
    const inputTag = match[0];
    const nameMatch = inputTag.match(/name\s*=\s*["']([^"']+)["']/i);
    const valueMatch = inputTag.match(/value\s*=\s*["']([^"']*)["']/i);

    if (nameMatch) {
      const name = nameMatch[1];
      const value = valueMatch ? valueMatch[1] : '';
      fields[name] = value;
    }
  }

  return fields;
}

// Fetch page (SAME AS SESSION-PICKER)
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
      req.abort();
      reject(new Error('Request timeout'));
    });
  });
}

// Post page (SAME AS SESSION-PICKER)
function postPage(cookieString, pagePath, formData) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify(formData);

    const options = {
      hostname: 'mebbisyd.meb.gov.tr',
      path: pagePath,
      method: 'POST',
      headers: {
        'Cookie': cookieString,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
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
      req.abort();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// Parse table from HTML
function parseTable(html, tableId) {
  const tableRegex = new RegExp(`<table[^>]*id="${tableId}"[^>]*>([\\s\\S]*?)<\\/table>`, 'i');
  const tableMatch = html.match(tableRegex);
  
  if (!tableMatch) {
    return [];
  }
  
  const tableHtml = tableMatch[1];
  const rows = [];
  
  // Find header row (first tr with th tags)
  const headerRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/i;
  const headerRowMatch = tableHtml.match(headerRowRegex);
  let headers = [];
  
  if (headerRowMatch) {
    const cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
    let cellMatch;
    
    while ((cellMatch = cellRegex.exec(headerRowMatch[1])) !== null) {
      let cellText = cellMatch[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#231;/g, 'ç')
        .replace(/&#252;/g, 'ü')
        .replace(/&#246;/g, 'ö')
        .replace(/&#220;/g, 'Ü')
        .replace(/&#199;/g, 'Ç')
        .replace(/&#214;/g, 'Ö')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
      
      if (cellText) {
        headers.push(cellText);
      }
    }
  }
  
  // Find all data rows (all tr tags after header)
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  let firstRow = true;
  
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    // Skip first row (header)
    if (firstRow) {
      firstRow = false;
      continue;
    }
    
    const rowContent = rowMatch[1];
    const cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
    const cells = [];
    let cellMatch;
    
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      let cellText = cellMatch[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#231;/g, 'ç')
        .replace(/&#252;/g, 'ü')
        .replace(/&#246;/g, 'ö')
        .replace(/&#220;/g, 'Ü')
        .replace(/&#199;/g, 'Ç')
        .replace(/&#214;/g, 'Ö')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
      cells.push(cellText);
    }
    
    if (cells.length > 0 && cells.some(c => c.length > 0)) {
      const rowObj = {};
      headers.forEach((header, idx) => {
        rowObj[header] = cells[idx] || '';
      });
      rows.push(rowObj);
    }
  }
  
  return rows;
}

async function fetchVehiclesAndSimulators(sessionId) {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🚗 MEBBIS Vehicle & Simulator Fetcher');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Get session from database
    console.log(`🗄️  Loading session from database (id: ${sessionId})...\n`);
    const session = await getSessionById(sessionId);
    
    // Fetch initial page to get form
    console.log('📡 Fetching initial page...');
    const initialResponse = await fetchPage(session.cookie, '/SKT/skt01002.aspx');
    console.log(`✓ Status: ${initialResponse.statusCode}`);
    console.log(`  Body: ${initialResponse.body.length} bytes\n`);
    
    if (initialResponse.statusCode !== 200) {
      console.error(`❌ Failed to fetch page. Status: ${initialResponse.statusCode}`);
      if (initialResponse.headers.location) {
        console.error(`   Redirecting to: ${initialResponse.headers.location}`);
      }
      process.exit(1);
    }
    
    // Extract form fields
    console.log('🔍 Extracting form fields...');
    const formFields = extractFormFields(initialResponse.body);
    console.log(`✓ Extracted ${Object.keys(formFields).length} fields\n`);
    
    // Fetch vehicles (dropTurSecim = 1)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📡 Fetching VEHICLES (dropTurSecim=1)...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const vehicleFormData = {
      ...formFields,
      '__EVENTTARGET': 'dropTurSecim',
      '__EVENTARGUMENT': '',
      'dropTurSecim': '1'
    };
    
    const vehicleResponse = await postPage(session.cookie, '/SKT/skt01002.aspx', vehicleFormData);
    console.log(`✓ Status: ${vehicleResponse.statusCode}`);
    console.log(`  Body: ${vehicleResponse.body.length} bytes\n`);
    
    if (vehicleResponse.statusCode !== 200) {
      console.error(`❌ Vehicle fetch failed. Status: ${vehicleResponse.statusCode}`);
      process.exit(1);
    }
    
    // Parse vehicles
    console.log('🔍 Parsing vehicle table...');
    const vehicles = parseTable(vehicleResponse.body, 'dgAracBilgileri');
    console.log(`✓ Found ${vehicles.length} vehicles\n`);
    
    // Save vehicle response for debugging
    fs.writeFileSync(path.join(__dirname, '..', 'responses', 'vehicles-dump.html'), vehicleResponse.body);
    
    // Fetch simulators (dropTurSecim = 2)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📡 Fetching SIMULATORS (dropTurSecim=2)...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const simulatorFormData = {
      ...formFields,
      '__EVENTTARGET': 'dropTurSecim',
      '__EVENTARGUMENT': '',
      'dropTurSecim': '2'
    };
    
    const simulatorResponse = await postPage(session.cookie, '/SKT/skt01002.aspx', simulatorFormData);
    console.log(`✓ Status: ${simulatorResponse.statusCode}`);
    console.log(`  Body: ${simulatorResponse.body.length} bytes\n`);
    
    if (simulatorResponse.statusCode !== 200) {
      console.error(`❌ Simulator fetch failed. Status: ${simulatorResponse.statusCode}`);
      process.exit(1);
    }
    
    // Parse simulators
    console.log('🔍 Parsing simulator table...');
    const simulators = parseTable(simulatorResponse.body, 'dgSimulatorBilgileri');
    console.log(`✓ Found ${simulators.length} simulators\n`);
    
    // Save simulator response for debugging
    fs.writeFileSync(path.join(__dirname, '..', 'responses', 'simulators-dump.html'), simulatorResponse.body);
    
    // Output results
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 RESULTS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const result = {
      session: {
        id: session.id,
        name: session.adi,
        userId: session.tbmebbisadi
      },
      vehicles: vehicles,
      simulators: simulators
    };
    
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n✅ Complete!');
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    if (error.code) console.error('   Code:', error.code);
    process.exit(1);
  }
}

// Get session ID from command line argument or use default
const sessionId = process.argv[2] || 1251;
console.log(`Using session ID: ${sessionId}\n`);
fetchVehiclesAndSimulators(sessionId);
