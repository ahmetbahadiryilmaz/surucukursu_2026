
  const  run = async (axios) => {
    return await axios.get('https://mebbis.meb.gov.tr/main.aspx?ntk=1',
      {
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
          'Content-Type': 'application/x-www-form-urlencoded',
          referer: 'https://mebasistan.meb.gov.tr/',
          origin: 'https://mebbis.meb.gov.tr'
        }
      }
    )
}
exports.getData = run
 
