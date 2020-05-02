import path from 'path';

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
        secure: Boolean(process.env.SMTP_SECURE),
        port: Number(process.env.SMTP_PORT),
        tls: {
          rejectUnauthorized: false,
        },
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
    username: process.env.INFLUXDB_USER,
    password: process.env.INFLUXDB_USER_PASSWORD,
    database: process.env.INFLUXDB_DB || 'aloes_dev',
    host: process.env.INFLUXDB_HOST || 'localhost',
    port: Number(process.env.INFLUXDB_PORT) || 8086,
    protocol: process.env.INFLUXDB_PROTOCOL || 'http',
    failoverTimeout: 60000,
    maxRetries: 5,
    timePrecision: 'ms',
  },
  storage: {
    name: 'storage',
    connector: 'loopback-component-storage',
    provider: 'filesystem',
    root: path.join(__dirname, process.env.FS_PATH || '../storage'),
    nameConflict: 'makeUnique',
    maxFileSize: '10428800',
  },
};
