const socket = require('./socket');

const routes = [
    {
      method: 'POST',
      url: '/socket',
      handler: socket.handler,
      schema: socket.schema
    },
 
  ]
  

module.exports = (app, options, done) => {
    routes.forEach((route, index) => {
      route.schema = route.schema || {}
      route.schema.tags = ['Test']
      app.route(route)
    })
    done()
  }
  