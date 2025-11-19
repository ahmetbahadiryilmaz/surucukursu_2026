process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const axios = require('./lib/Axios');
const { login } = require("./worker/run/loginAndGetSocketToken");
const { loginSocket } = require("./worker/run/loginSocket");
const { getData } = require("./worker/run/getData");
const fs = require('fs')
async function  callback(t, hidingID) {
    console.log('Can login:', t, hidingID)
    const response = await getData(axios);
    console.log(response)
    savePage(response.data)
}


async function savePage (html) {
    try {
      fs.writeFileSync('pag2e.html', html)
    } catch (error) {
      console.error('Error saving the page:', error)
    }
  }
  
async function run() {
    const r = await login(axios, '54202281330KIVILCIM', '111111');
    console.log(r)
    const token = r?.token; 
    console.log("gottoken", token);
    if (token) {
        await loginSocket(axios,token, callback);
    }
}
run();


