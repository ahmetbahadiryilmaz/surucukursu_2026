const { axios } = require('../../lib')
const cheerio = require('cheerio')
 const  isLoggedIn = async (cookieName) => {
     const r  =  await axios.get('https://mebbisyd.meb.gov.tr/main.aspx?ntk=1',
      {
        cookieName: cookieName,
        ///maxRedirects: 0,
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
          'Content-Type': 'application/x-www-form-urlencoded',
          referer: 'https://mebasistan.meb.gov.tr/',
          origin: 'https://mebbisyd.meb.gov.tr'
        }
      }
   ) 
   if (r.status == 200) {
     const $ = cheerio.load(r.data)
     const id = $('#ModulPageHeader1_lblKisi')?.text()
     if (id.length > 0) {
       
       console.error("Login TRUE", id);
       return { success: true, status: r.status, data: id }
     }
     console.error("Login False");
    }
    return { success: false, status:r.status, data: r.data }
    
 }
 exports.isLoggedIn = isLoggedIn