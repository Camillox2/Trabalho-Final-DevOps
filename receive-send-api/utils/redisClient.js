const redis = require('redis');

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'redis_cache',
    port: process.env.REDIS_PORT || "6379"
  }
});

redisClient.connect().catch(console.error);

module.exports = redisClient;
