/**
 * Session Picker - Interactive Session Browser
 * 1. Connects to mtsk_rapor database and queries tb_mebbis_view table
 * 2. Checks which users logged in today are still online
 * 3. Allows picking an online session
 * 4. Browses MEBBIS pages using the selected session
 */

const mysql = require('mysql2/promise');
const https = require('https');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const { exec } = require('child_process');

// Menu links for MEBBIS
const menuLinks = [
  { url: '/SKT/skt01001.aspx', text: 'Kurum Bilgileri' },
  { url: '/SKT/skt01002.aspx', text: 'Kurum Araç Giriş / Görüntüleme' },
  { url: '/SKT/skt01003.aspx', text: 'Kurum Derslik Giriş / Görüntüleme' },
  { url: '/SKT/skt01005.aspx', text: 'Kurum Randevu Tanımlama Ekranı' },
  { url: '/SKT/skt02001.aspx', text: 'Aday Dönem Kayıt İşlemleri' },
  { url: '/SKT/skt02002.aspx', text: 'Aday Fotograf Kayıt' },
  { url: '/SKT/skt02003.aspx', text: 'Aday Öğrenim Bilgisi Kayıt' },
  { url: '/SKT/skt02004.aspx', text: 'Aday Sağlık Raporu Kayıt' },
  { url: '/SKT/skt02005.aspx', text: 'Aday Sabıka Kayıt' },
  { url: '/SKT/SKT02010.aspx', text: 'Aday İmza Kayıt' },
  { url: '/SKT/skt02006.aspx', text: 'Dönem Adaylarını Onaylama' },
  { url: '/SKT/skt02007.aspx', text: 'e-Sınav Başvuru İşlemleri' },
  { url: '/SKT/skt02008.aspx', text: 'Sınav Sonuç Listeleme' },
  { url: '/SKT/skt02009.aspx', text: 'Aday Durum Görüntüleme' },
  { url: '/SKT/skt02011.aspx', text: 'Aday Sözleşme Bilgisi Kayıt' },
  { url: '/SKT/SKT02012.aspx', text: 'Aday Adres Beyan' },
  { url: '/SKT/skt02013.aspx', text: 'Aday Fatura Kayıt' },
  { url: '/SKT/skt03001.aspx', text: 'Dönem Grup Açılış Tarihi Giriş' },
  { url: '/SKT/skt03002.aspx', text: 'Grup Şube Tanımlama' },
  { url: '/SKT/skt03003.aspx', text: 'Teorik Ders Programı Giriş' },
  { url: '/SKT/skt03004.aspx', text: 'Direksiyon Eğitimi Ders Programı Giriş' },
  { url: '/SKT/skt04001.aspx', text: 'Teorik Ders Programı Görüntüleme' },
  { url: '/SKT/skt04002.aspx', text: 'Direksiyon Ders Programı Görüntüleme' },
  { url: '/SKT/skt04003.aspx', text: 'Sınav Bilgileri Görüntüleme' }
];

// Ensure directories exist
const responsesDir = path.join(__dirname, 'responses');
const cookiesDir = path.join(__dirname, 'cookies');
[responsesDir, cookiesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

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

// POST a form with given data
function postPage(cookieString, pagePath, formData) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams(formData).toString();
    
    const options = {
      hostname: 'mebbisyd.meb.gov.tr',
      path: pagePath,
      method: 'POST',
      headers: {
        'Cookie': cookieString,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000
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
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// Extract hidden form fields from HTML
function extractFormFields(html) {
  const fields = {};
  
  // Extract hidden inputs - handle both quotes and value with special chars
  const hiddenRegex = /<input[^>]*type\s*=\s*["']?hidden["']?[^>]*>/gi;
  const matches = html.match(hiddenRegex) || [];
  
  matches.forEach(input => {
    const nameMatch = input.match(/name\s*=\s*["']([^"']+)["']/i);
    // Handle value with special characters (base64, etc)
    const valueMatch = input.match(/value\s*=\s*["']([^"']*)["']/i) || 
                       input.match(/value\s*=\s*([^\s>]+)/i);
    if (nameMatch) {
      fields[nameMatch[1]] = valueMatch ? valueMatch[1] : '';
    }
  });
  
  console.log(`  [DEBUG] Found ${Object.keys(fields).length} hidden fields`);
  return fields;
}

// Extract dropdowns from HTML
function extractDropdowns(html) {
  const dropdowns = [];
  const selectRegex = /<select[^>]*name=["']([^"']+)["'][^>]*id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/select>/gi;
  
  let match;
  while ((match = selectRegex.exec(html)) !== null) {
    const name = match[1];
    const id = match[2];
    const optionsHtml = match[3];
    
    const options = [];
    const optionRegex = /<option[^>]*value=["']([^"']*)["'][^>]*>([^<]*)<\/option>/gi;
    let optMatch;
    while ((optMatch = optionRegex.exec(optionsHtml)) !== null) {
      options.push({
        value: optMatch[1],
        text: optMatch[2].replace(/&#(\d+);/g, (m, code) => String.fromCharCode(code))
      });
    }
    
    // Check for selected option
    const selectedMatch = optionsHtml.match(/<option[^>]*selected[^>]*value=["']([^"']*)["']/i);
    
    dropdowns.push({
      name,
      id,
      options,
      selectedValue: selectedMatch ? selectedMatch[1] : (options[0]?.value || '')
    });
  }
  
  return dropdowns;
}

// Check if a user's session is still valid
async function checkUserSession(user) {
  if (!user.cookie) {
    return { ...user, online: false, reason: 'No cookie' };
  }

  try {
    const response = await fetchPage(user.cookie);
    const headerInfo = extractHeaderInfo(response.body);

    if (headerInfo.found) {
      return {
        ...user,
        online: true,
        reason: 'Session valid',
        mebbisUser: headerInfo.userId,
        mebbisInstitution: headerInfo.institution,
        activeUsers: headerInfo.activeUsers
      };
    } else {
      return { ...user, online: false, reason: 'Session expired' };
    }
  } catch (error) {
    return { ...user, online: false, reason: `Error: ${error.message}` };
  }
}

// Add delay between requests
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get today's online users from database
async function getOnlineUsers() {
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
  console.log('  SESSION PICKER - MEBBIS Browser');
  console.log('========================================');
  console.log('Connecting to database...');

  let connection;
  const onlineUsers = [];

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

    console.log(`Found ${todayUsers.length} users logged in today. Checking sessions...\n`);

    for (let i = 0; i < todayUsers.length; i++) {
      const user = todayUsers[i];
      process.stdout.write(`[${i + 1}/${todayUsers.length}] Checking ${user.tbmebbisadi || user.mail || user.adi}... `);
      
      const result = await checkUserSession(user);
      
      if (result.online) {
        console.log('✅ ONLINE');
        onlineUsers.push(result);
      } else {
        console.log('❌ offline');
      }

      if (i < todayUsers.length - 1) {
        await delay(300);
      }
    }

    return onlineUsers;

  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Display session selection menu
function displaySessionMenu(onlineUsers) {
  console.log('\n' + '='.repeat(80));
  console.log('ONLINE SESSIONS');
  console.log('='.repeat(80));
  
  if (onlineUsers.length === 0) {
    console.log('\n❌ No online sessions found.');
    return;
  }

  onlineUsers.forEach((user, index) => {
    const loginTime = user.lastLoginH ? new Date(user.lastLoginH).toLocaleTimeString('tr-TR') : 'N/A';
    console.log(`\n${index + 1}. ${user.tbmebbisadi || user.mail}`);
    console.log(`   User: ${user.mebbisUser} | Institution: ${user.mebbisInstitution?.substring(0, 50)}...`);
    console.log(`   Last Login: ${loginTime}`);
  });
  
  console.log('\n' + '='.repeat(80));
}

// Display page menu
function displayPageMenu(selectedSession) {
  console.clear();
  console.log('='.repeat(100));
  console.log('MEBBIS Browser - Session:', selectedSession.tbmebbisadi || selectedSession.mail);
  console.log('User:', selectedSession.mebbisUser, '| Institution:', selectedSession.mebbisInstitution?.substring(0, 60));
  console.log('='.repeat(100));
  console.log('\nAvailable Pages:\n');

  menuLinks.forEach((link, index) => {
    const pageName = link.url.split('/').pop();
    console.log(`${String(index + 1).padStart(2, ' ')}. ${link.text.padEnd(50)} (${pageName})`);
  });

  console.log('\n' + '-'.repeat(100));
  console.log(' 0. ← Switch session / Back to session picker');
  console.log(' r. ↻ Refresh online sessions');
  console.log('\n' + '='.repeat(100));
}

// Main interactive loop
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  try {
    // Get online users
    const onlineUsers = await getOnlineUsers();

    if (onlineUsers.length === 0) {
      console.log('\n❌ No online sessions available. Exiting.');
      rl.close();
      return;
    }

    // Session picker loop
    let selectedSession = null;

    while (true) {
      if (!selectedSession) {
        // Show session picker
        displaySessionMenu(onlineUsers);
        
        const sessionInput = await question('\nSelect session (1-' + onlineUsers.length + ') or "exit" to quit: ');
        
        if (sessionInput.toLowerCase() === 'exit') {
          console.log('\nGoodbye!');
          break;
        }

        const sessionNum = parseInt(sessionInput);
        if (isNaN(sessionNum) || sessionNum < 1 || sessionNum > onlineUsers.length) {
          console.log('\n❌ Invalid selection.');
          await delay(1000);
          continue;
        }

        selectedSession = onlineUsers[sessionNum - 1];
        console.log(`\n✓ Selected: ${selectedSession.tbmebbisadi || selectedSession.mail}`);
      }

      // Page browser loop
      displayPageMenu(selectedSession);
      
      const pageInput = await question('\nEnter page number (1-24), 0 to switch session, or r to refresh: ');

      if (pageInput === '0') {
        selectedSession = null;
        continue;
      }

      if (pageInput.toLowerCase() === 'r') {
        console.log('\nRefreshing online sessions...');
        const refreshedUsers = await getOnlineUsers();
        onlineUsers.length = 0;
        onlineUsers.push(...refreshedUsers);
        selectedSession = null;
        continue;
      }

      const pageNum = parseInt(pageInput);
      if (isNaN(pageNum) || pageNum < 1 || pageNum > menuLinks.length) {
        console.log('\n❌ Invalid page number.');
        await delay(1000);
        continue;
      }

      const selectedPage = menuLinks[pageNum - 1];
      console.log(`\n⏳ Fetching: ${selectedPage.text}...`);

      try {
        const response = await fetchPage(selectedSession.cookie, selectedPage.url);
        console.log(`✓ Status Code: ${response.statusCode}`);

        // Extract header info to verify session
        const headerInfo = extractHeaderInfo(response.body);

        console.log('\n' + '='.repeat(80));
        console.log('RESPONSE INFO');
        console.log('='.repeat(80));

        if (headerInfo.found) {
          console.log('✅ SESSION VALID\n');
          console.log(`User ID: ${headerInfo.userId}`);
          console.log(`Institution: ${headerInfo.institution}`);
          console.log(`Active Users: ${headerInfo.activeUsers}`);
        } else {
          console.log('❌ SESSION EXPIRED - User might be forcefully logged out\n');
          // Remove from online users
          const idx = onlineUsers.findIndex(u => u.tbmebbis_id === selectedSession.tbmebbis_id);
          if (idx > -1) onlineUsers.splice(idx, 1);
          selectedSession = null;
        }

        console.log('='.repeat(80));

        // Save response
        const pageName = selectedPage.url.split('/').pop();
        const sessionName = (selectedSession?.adi || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
        let fileName = `${sessionName}_${pageName}.html`;
        let outputPath = path.join(responsesDir, fileName);
        fs.writeFileSync(outputPath, response.body);
        console.log(`\n✓ Response saved to: responses/${fileName}`);

        // Open in Chrome
        console.log('Opening in Chrome...');
        exec(`start chrome "${outputPath}"`, (err) => {
          if (err) console.log('Could not open Chrome:', err.message);
        });

        // Check for dropdowns and allow interaction
        const dropdowns = extractDropdowns(response.body);
        
        if (dropdowns.length > 0) {
          console.log('\n' + '-'.repeat(80));
          console.log('AVAILABLE DROPDOWNS:');
          console.log('-'.repeat(80));
          
          dropdowns.forEach((dropdown, idx) => {
            console.log(`\n${idx + 1}. ${dropdown.name} (${dropdown.id})`);
            console.log(`   Current: ${dropdown.selectedValue}`);
            console.log(`   Options:`);
            dropdown.options.forEach((opt, optIdx) => {
              const selected = opt.value === dropdown.selectedValue ? ' ← selected' : '';
              console.log(`     ${optIdx + 1}) ${opt.text} (value: ${opt.value})${selected}`);
            });
          });
          
          console.log('\n' + '-'.repeat(80));
          const dropdownInput = await question('\nSelect dropdown number to change (1-' + dropdowns.length + ') or Enter to skip: ');
          
          if (dropdownInput && dropdownInput.trim() !== '' && !isNaN(parseInt(dropdownInput))) {
            const dropdownIdx = parseInt(dropdownInput) - 1;
            
            if (dropdownIdx >= 0 && dropdownIdx < dropdowns.length) {
              const selectedDropdown = dropdowns[dropdownIdx];
              
              console.log(`\n=== Options for ${selectedDropdown.name} ===`);
              selectedDropdown.options.forEach((opt, idx) => {
                const marker = opt.value === selectedDropdown.selectedValue ? ' ← current' : '';
                console.log(`  ${idx + 1}) ${opt.text} (value: ${opt.value})${marker}`);
              });
              
              const optionInput = await question('\nSelect option number (1-' + selectedDropdown.options.length + '): ');
              
              if (optionInput && optionInput.trim() !== '') {
                const optionIdx = parseInt(optionInput) - 1;
                
                if (optionIdx >= 0 && optionIdx < selectedDropdown.options.length) {
                  const selectedOption = selectedDropdown.options[optionIdx];
                  console.log(`\n⏳ Posting with ${selectedDropdown.name} = "${selectedOption.text}" (${selectedOption.value})...`);
                  
                  // Extract hidden form fields
                  const formFields = extractFormFields(response.body);
                  
                  // Build POST data
                  const postData = {
                    ...formFields,
                    '__EVENTTARGET': selectedDropdown.id,
                    '__EVENTARGUMENT': '',
                    [selectedDropdown.name]: selectedOption.value
                  };
                  
                  console.log(`  [DEBUG] POST fields count: ${Object.keys(postData).length}`);
                  
                  try {
                    const postResponse = await postPage(selectedSession.cookie, selectedPage.url, postData);
                    console.log(`✓ POST Status Code: ${postResponse.statusCode}`);
                    console.log(`  [DEBUG] Response body length: ${postResponse.body.length}`);
                    
                    // Save POST response
                    const postFileName = `${sessionName}_${pageName}_${selectedDropdown.name}_${selectedOption.value}.html`;
                    const postOutputPath = path.join(responsesDir, postFileName);
                    fs.writeFileSync(postOutputPath, postResponse.body);
                    console.log(`✓ POST Response saved to: responses/${postFileName}`);
                    
                    // Open POST result in Chrome
                    console.log('Opening POST result in Chrome...');
                    exec(`start chrome "${postOutputPath}"`, (err) => {
                      if (err) console.log('Could not open Chrome:', err.message);
                    });
                    
                  } catch (postError) {
                    console.log(`\n❌ POST Error: ${postError.message}`);
                  }
                } else {
                  console.log('\n❌ Invalid option number.');
                }
              }
            } else {
              console.log('\n❌ Invalid dropdown number.');
            }
          }
        }

        await question('\nPress Enter to continue...');
      } catch (error) {
        console.log(`\n❌ Error: ${error.message}`);
        await question('\nPress Enter to continue...');
      }
    }

  } catch (error) {
    console.error('\n✗ Error:', error.message);
  } finally {
    rl.close();
  }
}

main();
