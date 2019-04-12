module.exports = {
  //	cookieSecret: '246bace2-38cb-4138-85d9-0ae8160b07c8',
  redis: {
    db: Number(process.env.REDIS_HTTP_COLLECTION) || 1,
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASS,
  },
};
