const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const https = require('https');

// Extract hidden form inputs from HTML
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

// Post page
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
  
  // Find header row
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
      
      if (cellText) headers.push(cellText);
    }
  }
  
  // Find all data rows
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  let firstRow = true;
  
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
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

// Main fetch function
async function fetchVehiclesAndSimulators(session, initialPageBody, responsesDir) {
  try {
    // Extract hidden inputs from initial response
    const hiddenInputs = extractFormFields(initialPageBody);
    
    // Fetch vehicles (dropTurSecim = 1)
    console.log('📡 Fetching VEHICLES (Eğitim Aracı)...');
    const vehicleData = {
      ...hiddenInputs,
      '__EVENTTARGET': 'dropTurSecim',
      '__EVENTARGUMENT': '',
      'dropTurSecim': '1'
    };
    
    const vehicleResponse = await postPage(session.cookie, '/SKT/skt01002.aspx', vehicleData);
    
    let vehicles = [];
    if (vehicleResponse.statusCode === 200) {
      vehicles = parseTable(vehicleResponse.body, 'dgAracBilgileri');
      console.log(`✓ Found ${vehicles.length} vehicles`);
    } else {
      console.log(`❌ Vehicle fetch failed. Status: ${vehicleResponse.statusCode}`);
    }
    
    // Fetch simulators (dropTurSecim = 2)
    console.log('📡 Fetching SIMULATORS (Simülatör)...');
    const simulatorData = {
      ...hiddenInputs,
      '__EVENTTARGET': 'dropTurSecim',
      '__EVENTARGUMENT': '',
      'dropTurSecim': '2'
    };
    
    const simulatorResponse = await postPage(session.cookie, '/SKT/skt01002.aspx', simulatorData);
    
    let simulators = [];
    if (simulatorResponse.statusCode === 200) {
      simulators = parseTable(simulatorResponse.body, 'dgSimulatorBilgileri');
      console.log(`✓ Found ${simulators.length} simulators`);
    } else {
      console.log(`❌ Simulator fetch failed. Status: ${simulatorResponse.statusCode}`);
    }
    
    // Create combined object
    const combinedData = {
      session: {
        id: session.tbmebbis_id,
        name: session.adi,
        userId: session.tbmebbisadi
      },
      vehicles: vehicles,
      simulators: simulators,
      fetchedAt: new Date().toISOString()
    };
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMBINED DATA');
    console.log('='.repeat(80) + '\n');
    console.log(JSON.stringify(combinedData, null, 2));
    
    // Save combined data to file
    const sessionName = (session.adi || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
    const dataFileName = `${sessionName}_vehicles_simulators.json`;
    const dataOutputPath = path.join(responsesDir, dataFileName);
    fs.writeFileSync(dataOutputPath, JSON.stringify(combinedData, null, 2));
    console.log(`\n✓ Data saved to: responses/${dataFileName}`);
    
    return combinedData;
  } catch (error) {
    console.log(`\n❌ Error during fetch: ${error.message}`);
    throw error;
  }
}

module.exports = {
  fetchVehiclesAndSimulators,
  extractFormFields,
  postPage,
  parseTable
};
