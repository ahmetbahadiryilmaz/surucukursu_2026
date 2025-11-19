const cheerio = require('cheerio')
require('dotenv').config()
const fs = require('fs')
const FormData = require('form-data')
let axios = null
async function getInputNamesAndValues (html) {
  try {
    // Load the HTML into Cheerio
    const $ = cheerio.load(html)

    // Create an object to store input names and values
    const inputs = {}

    // Select the first form and iterate over its input elements
    const firstForm = $('form').first()
    if (!firstForm.length) {
      console.error('No forms found on the page.')
      return {}
    }

    firstForm.find('input').each((index, element) => {
      const name = $(element).attr('name')
      const value = $(element).attr('value') || ''
      if (name) {
        inputs[name] = value
      }
    })

    return inputs
  } catch (error) {
    console.error('Error fetching or parsing the page:', error)
    return {}
  }
}

async function tryLogin (username, password) {
  try {
    const url = 'https://mebbis.meb.gov.tr/default.aspx?NoSession'
    const r = await axios.get(url)
    const formData = await getInputNamesAndValues(r.data)
    formData.txtKullaniciAd = username
    formData.txtSifre = password
    const formDataObj = new FormData()
    for (const key in formData) {
      formDataObj.append(key, formData[key])
    }

    const response = await axios.post(url, formDataObj, {
      withCredentials: true,
      headers: {
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
        'Content-Type': 'application/x-www-form-urlencoded',
        referer: 'https://mebbis.meb.gov.tr/default.aspx?NoSession',
        origin: 'https://mebbis.meb.gov.tr'
      },
      maxRedirects: 0
    })

    // Log the response status
    console.log('#rstatus', response.status)
    return response
  } catch (error) {
    if (error.status >= 300 && error.status < 400) {
      return {
        data: error.data,
        isRedirect: true,
        redirectedTo: error.response.headers.location
      }
    } else {
      console.error('Error posting the form data:', error)
    }
  }
}

async function getSocketTokenAndInputs () {
  const response = await axios.get('https://mebbis.meb.gov.tr/redirect.aspx', {
    headers: {
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
      'Content-Type': 'application/x-www-form-urlencoded',
      referer: 'https://mebbis.meb.gov.tr/redirect.aspx',
      origin: 'https://mebbis.meb.gov.tr'
    },
  })
    const $ = cheerio.load(response.data)
    const tokenUrl = $('iframe').attr('src')
    const tokenPattern = /[?&]token=([^&]+)/
    const match = tokenUrl?.match(tokenPattern)
    if (match) {
      const token = match[1]
      console.log('socket token', token)
      return {
        token,
        inputs: await getInputNamesAndValues(response.data)
      }
    } else {
      savePage(response.data)
      throw new Error('Token not found2',tokenUrl)
    }
 
}

async function savePage (html) {
  try {
    fs.writeFileSync('page.html', html)
  } catch (error) {
    console.error('Error saving the page:', error)
  }
}

async function login(_axios, username, password) {
  axios = _axios
  const loginResult = await tryLogin(username, password)
  //console.log("loginResult",loginResult)
  if (
    loginResult.isRedirect &&
    loginResult.redirectedTo === 'https://mebbis.meb.gov.tr/redirect.aspx'
  ) {
    return await getSocketTokenAndInputs()
 
  } else if (!loginResult.isRedirect && loginResult.status == 200) {
    //that means login failed
    const $ = cheerio.load(loginResult.data)
    const errorMessage = $('#lblSorun').text()
    throw new Error(errorMessage ?? 'Login failed Unknown error')
    if (errorMessage) console.error('Login failed:', errorMessage)
  }
  // console.log(page)
  //await savePage(page);
}

exports.login = login
