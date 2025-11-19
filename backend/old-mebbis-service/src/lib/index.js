const knex = require('./Knex')
//const readcsv = require('./CsvParser')
const axios = require('./Axios')
const fetch = require('./Fetch')
module.exports = {
    knex:knex,
    //readcsv,
    axios,
    fetch
    //redis: require('./Redis'),
}