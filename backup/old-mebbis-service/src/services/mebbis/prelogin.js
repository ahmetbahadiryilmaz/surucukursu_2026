const cheerio = require('cheerio')
const fs = require('fs')
const FormData = require('form-data')
const axios = require('@lib/Axios')
const { loginSocket } = require('../../worker/run/loginSocket')
class Prelogin{
  //cosntructor 
  constructor(baseUrl,cookieName){
    this.baseUrl = baseUrl
    this.cookieName = cookieName
    
  }

  async  getInputNamesAndValues (html) {
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
  
  async tryLogin(username, password) {
    let r = { success: false, data: null }
    try {
      const url = this.baseUrl + 'default.aspx?NoSession'
      const r = await axios.get(url, {
        cookieName: this.cookieName,
      })
      const formData = await this.getInputNamesAndValues(r.data)
      formData.txtKullaniciAd = username
      formData.txtSifre = password
      const formDataObj = new FormData()
      for (const key in formData) {
        formDataObj.append(key, formData[key])
      }
  
      const response = await axios.post(url, formDataObj, {
        withCredentials: true,
        cookieName: this.cookieName,
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
          'Content-Type': 'application/x-www-form-urlencoded',
          referer: this.baseUrl + 'default.aspx?NoSession',
          origin: this.baseUrl  
        },
        maxRedirects: 0
      })
  
      // Log the response status
      console.log('#rstatus', response.status)
      //get lblSorun with cheerio
      const $ = cheerio.load(response.data)
      const errorMessage = $('#lblSorun').text()
      return { success: false ,isRedirect:false,status:response.status,data:errorMessage??"undefined"} 
    } catch (error) {
      if (error.status >= 300 && error.status < 400 &&  this.baseUrl+ 'redirect.aspx'  == error.response.headers.location) {
        console.warn('Redirected to main page, login successful');
        return {
          success:true,
          data: error.data,
          isRedirect: true,
          redirectedTo: error.response.headers.location //  this.baseUrl+ 'redirect.aspx'  
        }
      } else {
        const response = { success: false,"location":error.response.headers.location ,"expected":this.baseUrl+ 'redirect.aspx' ,data: error.data }
        console.error('Login error:', error,response);
        return response;
      }
    }
  
    }
    
  
  
  async  getSocketTokenAndInputs () {
    const response = await axios.get(this.baseUrl + 'redirect.aspx', {
        cookieName: this.cookieName,
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
          'Content-Type': 'application/x-www-form-urlencoded',
          referer: this.baseUrl+'redirect.aspx',
          origin: this.baseUrl
        },
      })
      const $ = cheerio.load(response.data)
      const tokenUrl = $('iframe').attr('src')
      const tokenPattern = /[?&]token=([^&]+)/
      const match = tokenUrl?.match(tokenPattern)
      //if (match) {
        const token =match? match[1]:   tokenUrl
        console.log('socket token', token)
        return {
          token,
          inputs:  {
            token,
            ...await this.getInputNamesAndValues(response.data)
          }
        }
      /*} else {
        //savePage(response.data)
        throw new Error('Token not found',tokenUrl)
      }*/
   
  }
  
  async  savePage (html) {
    try {
      fs.writeFileSync('page.html', html)
    } catch (error) {
      console.error('Error saving the page:', error)
    }
  }
  
  



  async  login( username, password,callback) {
   
    const loginResult = await this.tryLogin(username, password)
    console.log("loginResult",loginResult)
    if (
       loginResult.success
    ) {
      const dataForSocket = await this.getSocketTokenAndInputs()
    
      //await loginSocket(this.cookieName, dataForSocket.token, callback)
       

      return {
        success: true, data: {
          token: dataForSocket.token,
          inputs: dataForSocket.inputs,
          status: "awaiting socket or confirm data"
        }
      }
    
    } else if (!loginResult.success) {
      //that means login failed
      const $ = cheerio.load(loginResult.data)
      const errorMessage = $('#lblSorun').text()
      throw new Error(errorMessage ?? 'Login failed Unknown error')
   
    }
    // console.log(page)
    //await savePage(page);
  }
  

  async loginWithCode(code) {

    const dataForSocket = await this.getSocketTokenAndInputs()
    if (!dataForSocket.token) {
      return { success: false, message: 'Token not found1' }
    }

    dataForSocket.inputs.txtCode = code
    dataForSocket.inputs.__EVENTTARGET = "dogrula"
    const formData = dataForSocket.inputs
    const formDataObj = new FormData()
    for (const key in formData) {
      formDataObj.append(key, formData[key])
    }
    try {
      const url = this.baseUrl + '/redirect.aspx'
      const response = await axios.post(url, formDataObj, {
        withCredentials: true,
        cookieName: this.cookieName,
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
          'Content-Type': 'application/x-www-form-urlencoded',
          referer: this.baseUrl + '/default.aspx?NoSession',
          origin: this.baseUrl  
        },
        maxRedirects: 0
      })
      console.log('#rstatus', response.status)
      const $ = cheerio.load(response.data)
      const errorMessage = $('.error').text()
      if(errorMessage){
        console.log('error', errorMessage)
        return { success: false ,isRedirect:false,status:response.status,data:errorMessage??"undefined"} 
      } 
    } catch (error) { // when redirected it goes to error with 302 code
      if (error.status >= 300 && error.status < 400 && error.response.headers.location.includes('main.aspx')) {
          return {
          success:true,
          data: error.data,
          isRedirect: true,
          redirectedTo: error.response.headers.location //  this.baseUrl+ 'redirect.aspx'  
        }
      } else {
        return { success: false,"location":error.response.headers.location ,"expected":this.baseUrl+ 'redirect.aspx' ,data: error.data }
      }
    }
  }


}

module.exports = Prelogin;
