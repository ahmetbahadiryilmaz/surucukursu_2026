const io = require('socket.io-client')
const baseUrl= "https://mebbisyd.meb.gov.tr"

const { axios } = require('../../lib')
const loginSocket = async (cookieName, token, callback) => {
  let  done = false;
  // Replace with your WebSocket server URL
  const SERVER_URL = 'wss://mebasistan.meb.gov.tr'

  // Function to create a UUID
  function create_UUID () {
    var t = new Date().getTime()
    return 'xxxxxxx_xxxxxxxxxxxx-xxxxxx_xx'.replace(/[xy]/g, function (e) {
      var o = (t + 16 * Math.random()) % 16 | 0
      return (t = Math.floor(t / 16)), ('x' == e ? o : (3 & o) | 8).toString(16)
    })
  }

  // Function to hide the ID
  function hide_ID (t) {
    var e = ''
    for (i = 0; i < t.length; i++) {
      var o = 122 - t[i].charCodeAt(0)
      o < 10 && (o = '0' + o), (e += o.toString())
    }
    return e
  }

  const headers = {
    Origin: 'https://mebasistan.meb.gov.tr',
    Host: 'mebasistan.meb.gov.tr',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
  }
  const socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    secure: false,
    rejectUnauthorized: false,
    extraHeaders: headers
  })
  let socketid, hidingID

  socket.on('connect', () => {
    console.log('Connected to server')
  })

   setTimeout(() => {
    if (!done) {
    console.error("socket closed after timed out loginSocket.js");
      socket.close();
    }
  }, 150000); // 20 seconds

  socket.on('message', data => {
    console.log('Message from server:', data) // Print whatever the socket returns
  })

  socket.onAny((event, data) => {
    console.log(`Received event '${event}':`, data)
  })

  socket.on('disconnect', () => {
    console.log('Disconnected from server')
  })

  socket.on('connect_error', err => {
    console.error('Connection error:', err)
  })

  // Emit "getConfirm" event upon connection
  socket.emit('getConfirm', t => {
    console.log('getconfirm', t)
    hidingID = hide_ID((socketid = socket.id))
    createduuid = create_UUID()

    data = {
      token: token,
      verify: createduuid.substr(0, 15) + socketid + createduuid.substr(15)
    }

    // Use Axios to send data to server
    try {
      axios
        .get('https://mebasistan.meb.gov.tr/send', {
          rejectUnauthorized: false,
          params: {
            token: data.token,
            verify: data.verify
          }
        })
        .then(response => {
          console.log('Response from server:', response.data)
        })
        .catch(error => {})
    } catch (error) {}
  })

  // Handle "canLogin" event from server
  socket.on('canLogin', (t) =>{
      console.log('Can login:', t, hidingID)
        axios.get(baseUrl+ '/QRCodeLogin.aspx?param1=' + t + '&param2=' + hidingID,
      {
        //maxRedirects: 0,
        cookieName: cookieName,
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
          'Content-Type': 'application/x-www-form-urlencoded',
          referer: 'https://mebasistan.meb.gov.tr/',
          origin:baseUrl
        },
    }
    ).then(response => {
      console.log('Response from server:', response.data)
      done=true
      socket.close()
        callback(t, hidingID).then(() => {
        console.log("callback done")
      })
    })
  })
}

exports.loginSocket = loginSocket