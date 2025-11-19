const { config } = require('dotenv')
const { axios,fetch } = require('../../lib')
const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')
const { default: parse } = require('node-html-parser')


const axiosConfig = {
  redirect: 'manual',  // Prevents automatic redirects, equivalent to `maxRedirects: 0`
  headers: {
    //'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    //'Accept-Encoding': 'gzip, deflate, br',  // This header is often handled automatically by the browser; it's included here for completeness
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
    'Referer': 'https://mebasistan.meb.gov.tr/',
    'Origin': 'https://mebbisyd.meb.gov.tr',
    'Content-Type': 'application/x-www-form-urlencoded'

  },
}



async function savePage(html) {
  try {
    fs.writeFileSync(path.join(__dirname, '/../../../logs', 'pag2e.html'), html)
  } catch (error) {
    console.error('Error saving the page:', error)
  }
}




const processColumnNames = (columnNames) => {
  return columnNames.map(col => col
    .replace(/\s/g, '_')              // Replace spaces with underscores
    .replace(/ı/g, 'i')               // Replace Turkish characters
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i')
    .replace(/[^a-zA-Z0-9_]/g, '')   // Remove special characters
    .toLowerCase());                 // Convert to lowercase
};

const getFormdata = (r2Root, durum,egitimDonemi) => {
  // Create a new FormData object
  let formData = new FormData();

  // Populate FormData with input values from the form
  r2Root.querySelectorAll('#FRM_SKT02006 input').forEach(el => {
    formData.set(el.getAttribute('name'), el.getAttribute('value') ?? "");
  });

  // Manually append the additional fields to FormData
  formData.set('cmbEgitimDonemi', egitimDonemi);
  formData.set('cmbGrubu', -1);
  formData.set('cmbSubesi', -1);
  formData.set('cmbDurumu', 4);
  formData.set('cmbOgrenciDurumu', durum);
  formData.set('btnListele', '.:: Listele ::.');

  return formData;
}
 
function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function getMemoryUsage(variable, visited = new Set()) {
  let bytes = 0;

  // Handle circular references
  if (variable !== null && typeof variable === 'object') {
      if (visited.has(variable)) {
          return 0;
      }
      visited.add(variable);
  }

  // Strings: 2 bytes per character (UTF-16)
  if (typeof variable === 'string') {
      bytes = variable.length * 2;
  } else if (typeof variable === 'number') {
      // Numbers: 8 bytes (64-bit floating point)
      bytes = 8;
  } else if (Array.isArray(variable)) {
      // Arrays: Sum of the sizes of the elements
      bytes = variable.map(item => getMemoryUsage(item, visited)).reduce((acc, curr) => acc + curr, 0);
      // Add a rough estimate for the array structure overhead (12 bytes per element + 24 bytes base overhead)
      bytes += variable.length * 12 + 24;
  } else if (typeof variable === 'object' && variable !== null) {
      // Objects: Sum of the sizes of the keys and values
      for (let key in variable) {
          // Ensure that key exists directly on the object and not in its prototype chain
          if (Object.prototype.hasOwnProperty.call(variable, key)) {
              // Add memory for the key (assume 2 bytes per character)
              bytes += key.length * 2;
              // Add memory for the value
              bytes += getMemoryUsage(variable[key], visited);
          }
      }
      // Add a rough estimate for the object structure overhead
      bytes += 24;
  }

  return  ( bytes);
}
const getMemoryUsageF = (variable) => {
  return formatBytes(getMemoryUsage(variable));
}

 
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const candidatesList = async (cookieName) => {
  
  try {
    axiosConfig.cookieName = cookieName;
    
    // Fetch the first page
    await fetch.get('https://mebbisyd.meb.gov.tr/SKT/skt00001.aspx', axiosConfig);

    // Fetch the second page
    let  r2 = await fetch.get('https://mebbisyd.meb.gov.tr/SKT/skt02006.aspx', axiosConfig);

    let r2Html = r2.data;
    
    let r2Root = parse(r2Html);

    // Extract durumlar options
    const durumlar = r2Root.querySelectorAll('#cmbOgrenciDurumu option').map(el => ({
      value: el.getAttribute('value'),
      text: el.textContent
    }));
    //dont take -1 and 1 and limit with 10 
    const egitimDonemleri = r2Root.querySelectorAll('#cmbEgitimDonemi option').map(el => {
      return ({
        value: el.getAttribute('value'),
        text: el.textContent
      })
    }).filter((el) => el.value != -1 && el.value != 1).slice(0, 10);


  
    if (durumlar.length === 0) {
      console.error('No durumlar found');
      return { success: false, status: r2.status, data: 'No durumlar found' };
    }
    if (egitimDonemleri.length === 0) {
      console.error('No egitimDonemleri found');
      return { success: false, status: r2.status, data: 'No egitimDonemleri found' };
    }
    console.log('Memory usage r2root:',  getMemoryUsageF(r2Root));
    // Process candidates
    const candidates = [];
    for (const egitimDonemi of egitimDonemleri) {
      
      for (const durumu of durumlar) {
    
        let formDataTemplate = getFormdata(r2Root, durumu.value,egitimDonemi.value);
        console.log('Memory usage fdata :', getMemoryUsageF(formDataTemplate));
        r2= null
        // Post data and get candidates
        r2 = await fetch.post('https://mebbisyd.meb.gov.tr/SKT/skt02006.aspx', formDataTemplate, axiosConfig);
        const r2Data = r2.data;
        r2=null
        console.log('Memory usage r3:', getMemoryUsageF(r2));
        formDataTemplate = {}
        r2Html = r2Data;
        
        r2Root = parse(r2Html);
        const id = r2Root.querySelector('#SktPageHeader1_lblKullaniciAdi')?.textContent.trim();
        if (id) {
          const table = r2Root.querySelector('table#dgListele');
        console.log('Memory usage table:', getMemoryUsageF(table));

          const columnNames = processColumnNames(
            r2Root.querySelectorAll('.frmListBaslik td').map(el => el.textContent)
          );
        console.log('Memory usage columnnames:', getMemoryUsageF(columnNames));

          if (!table) continue;
          table.querySelectorAll('tr').slice(1).forEach(row => {
            const candidate = {};
            row.querySelectorAll('td').forEach((cell, j) => {
              const columnName = columnNames[j];
              if (columnName === 'fotograf') {
                candidate[columnName] = cell.querySelector('img')?.getAttribute('src');
              } else {
                candidate[columnName] = cell.innerHTML;
              }
            });
            candidate.status = durumu.value;
            candidates.push(candidate);

          });
          console.log('Memory usage candiates:', getMemoryUsageF(candidates));

        } else {
          throw new Error('No id found');
        }

      }
    }
      


    return { success: true, status: 200, data: candidates };
  } catch (error) {
    console.error('Error getting candidates:', error);
    return { success: false, status: 400, data: error.message };
  }
};
exports.candidatesList = candidatesList