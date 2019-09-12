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
    name: 'cache',
    connector: 'kv-memory',
  },
  points: {
    name: 'points',
    connector: 'influxdata',
    username: process.env.INFLUX_USER,
    password: process.env.INFLUX_PASS,
    database: process.env.INFLUX_COLLECTION || 'aloes_dev',
    host: process.env.INFLUX_HOST || 'localhost',
    port: Number(process.env.INFLUX_PORT) || 8086,
    protocol: process.env.INFLUX_PROTOCOL || 'http',
    failoverTimeout: 60000,
    maxRetries: 5,
    timePrecision: 'ms',
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
