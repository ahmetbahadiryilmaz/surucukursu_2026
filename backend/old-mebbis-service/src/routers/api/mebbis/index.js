const login = require('./login/index')
const sync = require('./sync/index') 
const routes = [
  {
    method: 'POST',
    url: '/login/trylogin',
    handler: login.tryLogin.handler,
    schema: login.tryLogin.schema
  },
  {
    method: 'POST',
    url: '/login/withNotification',
    handler: login.withNotification.handler,
    schema: login.withNotification.schema
  },
  {
    method: 'POST',
    url: '/login/isLoggedIn', 
    handler: login.isLoggedIn.handler,
    schema: login.isLoggedIn.schema
  },
  {
    method: 'POST',
    url: '/sync/candidates',
    handler: sync.candidates.handler,
    schema: sync.candidates.schema
  },
  {
    method: 'POST',
    url: '/login/withCode',
    handler: login.withCode.handler,
    schema: login.withCode.schema
  }
 
]

module.exports = (app, options, done) => {
  routes.forEach((route, index) => {
    route.schema = route.schema || {}
    route.schema.tags = ['Mebbis']
    app.route(route)
  })
  done()
}
