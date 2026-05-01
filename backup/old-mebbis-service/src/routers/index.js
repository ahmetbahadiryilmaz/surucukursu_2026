const api = require('./api')

const routerList = [{ module: api, options: { prefix: 'api' } }]


module.exports = function (app) {
  routerList.forEach(data => {
    app.register(data.module, data.options)
  }) 
}
 