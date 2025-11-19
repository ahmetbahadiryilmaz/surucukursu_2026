const redis = require('ioredis').default;
const { env } = require('../config'); 
// Create a Redis client
 
 
 
module.exports = new redis(env.REDIS_PORT,env.REDIS_HOST, { password: env.REDIS_PASSWORD } );