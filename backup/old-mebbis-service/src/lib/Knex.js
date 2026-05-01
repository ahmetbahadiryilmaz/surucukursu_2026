const Knex = require('knex')
const { env } = require('../config')

/**
 * @type {import('knex').Knex}
 */
 
const knex =  Knex({
    client :"mysql",
    connection:env.DB_CONNECTION
})
 
module.exports = knex



