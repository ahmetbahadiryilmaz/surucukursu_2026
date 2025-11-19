const { assert } = require('console');
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const {
    DB_CONNECTION,
    NODE_ENV,
    PORT,
   // REDIS_HOST,
    //REDIS_PORT,
    //REDIS_PASSWORD,
    HOST
} = process.env;
assert(DB_CONNECTION,'DB_CONNECTION must be defined');
//assert(REDIS_HOST, 'REDIS_CONNECTION must be defined');
 
module.exports = {
    DB_CONNECTION,
    //REDIS_HOST,
    //REDIS_PASSWORD,
    //REDIS_PORT,
    NODE_ENV,
    PORT,
    HOST
}