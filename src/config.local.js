module.exports = {
  redis: {
    db: Number(process.env.REDIS_HTTP_COLLECTION) || 1,
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    // password: Number(process.env.REDIS_PASSWORD),
  },
};
