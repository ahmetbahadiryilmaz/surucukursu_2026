// api.js
const mebbis = require("./mebbis");
const test = require("./test");

module.exports = function (app, options, done) {
  const modules = [
    { module: mebbis, options: { prefix: 'mebbis' } },
    { module: test, options: { prefix: 'test' } }
  ];

  modules.forEach(data => {
    app.register(data.module, data.options);
  });

  done();
};
