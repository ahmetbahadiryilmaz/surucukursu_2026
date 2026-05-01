require('module-alias/register')
const env= require('@config/env')

global.jsonParse = str => {
  try {
    return JSON.parse(str)
  } catch (e) {
    return null
  }
}

process.env.mainPath = __dirname
const fastify = require('fastify').default
const { join } = require('path')
const appHooks = require('./lib/fastify').Hooks
const appRegister = require('./lib/fastify').Register
const socketIo = require('./lib/fastify').Socketio
const { knex } = require('@lib')

const routeCollections = require('@routers')
const { randomUUID } = require('crypto') 

const app = fastify({
 
  bodyLimit: 150048576,
  logger: {
   // file: join(__dirname, process.env.MODE === 'dev' ? '../logs/dev.log' : '../logs/prod.log'),
    name: 'mebbis-service',
    redact: ['accessToken', 'refreshToken', 'token', '*.token', 'access_token', 'refresh_token', '*.pass', '*.shipToPhone', '*.accessToken', '*.ship_to_phone', '*.shipToEmail', '*.ship_to_email', '*.phone', '*.password', 'images[*]', 'images.*', 'image', 'attachment', 'file', '[*].file', 'images']
  },
  genReqId: randomUUID,
  disableRequestLogging: true,
  maxResponseSize: 1024 * 1024 * 10 // 1 MB
})

// Register dynamic response route for /response/:id
app.get('/response/:id', (req, reply) => {
  const id = req.params.id;
  const response = global.responseStore && global.responseStore[id];
  if (response) {
    reply.header('content-type', 'text/html; charset=utf-8').send(response.html);
  } else {
    reply.code(404).header('content-type', 'text/html; charset=utf-8').send('<h1>Response not found</h1>');
  }
})

const start = async port => {
  try {
    await appRegister(app)
    appHooks(app)
    socketIo(app)
    routeCollections(app)
    app.listen({ port, host: env.HOST })
    app.printRoutes();

  } catch (e) {
    console.log(e)
    process.exit(1)
  }
  console.log("start at ", "http://"+ env.HOST + ":" + env.PORT)
}


start(env.PORT)