module.exports = {
  db: {
    name: 'db',
    connector: 'memory',
    maxDepthOfQuery: 12,
    maxDepthOfData: 32,
    // file: './log/session.json',
  },
  email: {
    name: 'email',
    connector: 'mail',
    transports: [
      {
        type: 'smtp',
        host: process.env.SMTP_HOST,
        secure: process.env.SMTP_SECURE,
        port: Number(process.env.SMTP_PORT),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
    ],
  },
  cache: {
    db: process.env.REDIS_COLLECTIONS || '3',
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    name: 'cache',
    connector: 'kv-redis',
    lazyConnect: true,
  },
  storage: {
    name: 'storage',
    connector: 'loopback-component-storage',
    provider: 'filesystem',
    root: process.env.FS_PATH || './storage',
    nameConflict: 'makeUnique',
    maxFileSize: '10428800',
  },
};
