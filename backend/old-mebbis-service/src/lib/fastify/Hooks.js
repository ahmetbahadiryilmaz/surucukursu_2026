//const knex = require('./Knex')
const response = require('./Response')
const { authenticate } = require('../../middleware/auth')

module.exports = function (app) {
  app.decorateRequest('fastify', null)    


  app.addHook('onRequest', (request, reply, done) => {
    request.fastify = app
    request.io = app.io
    request.sendResponse = message => {
      return response.sendSuccess(reply, message)
    }
    request.sendError = (message, statusCode = 400) => {
      return response.sendError(reply, message, statusCode)
    }

    if (process.env.NODE_ENV === 'dev')
      console.log(request.body, request.params)

    done()
  })

  app.addHook('preHandler', authenticate)

  app.addHook('onSend', (req, res, payload, done) => {
    //if url starts with swagger
    if(req.url.startsWith('/swagger')) return done()
    let status, msg, statusKey, data;
    if (payload && typeof payload === 'string') {
      try {
        const parsed = JSON.parse(payload);
        status = parsed.status;
        msg = parsed.msg;
        statusKey = parsed.statusKey;
        data = parsed.data;
      } catch (e) {
        // Not JSON, just log the string
        req.log.info({ url: req.url, response: payload }, 'req completed (non-JSON payload)');
        done();
        return;
      }
    } else {
      status = msg = statusKey = data = undefined;
    }
    //res.getResponseTime().toFixed(2) -- res.getElapsedTime().toFixed(2) deprecated
    const log = {
      url: req.url,
      query: req.query,
      userId: req.user?.id,
      reqBody: req.body,
      method: req.method,
      response: { status, msg, statusKey },
      statusCode: res.statusCode,
      responseTime: res.elapsedTime
    }
    if (status > 400) log.body = { data };
    req.log.info(log, 'req completed')
    done()
  })

  app.setErrorHandler((error, req, reply) => {
    if (error instanceof Error && error.message === 'You are forbidden to connect to client_connect_invalid_ip') {
      console.error('Forbidden to connect to client_connect_invalid_ip. Please check your IP configuration.')
    } else {
      // For other errors, you can log or handle them accordingly
      console.error("fst", error)
       console.log(req.body)
    }
    reply.send(error)
  })
}