module.exports = {
  db: {
    name: 'db',
    connector: 'mongodb',
    database: process.env.MONGO_COLLECTION || 'ymc_stage',
    host: process.env.MONGO_HOST || 'localhost',
    port: Number(process.env.MONGO_PORT) || 27017,
    auth: {
      user: process.env.MONGO_USER || '',
      password: process.env.MONGO_PASS || '',
    },
    useNewUrlParser: true,
    lazyConnect: false,
    maxDepthOfQuery: 12,
    maxDepthOfData: 32,
    allowExtendedOperators: true,
    enableGeoIndexing: true,
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
  storage: {
    name: 'storage',
    connector: 'loopback-component-storage',
    provider: 'filesystem',
    root: process.env.FS_PATH || './storage',
    nameConflict: 'makeUnique',
    maxFileSize: '10428800',
  },
};
