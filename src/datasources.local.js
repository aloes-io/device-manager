module.exports = {
  db: {
    name: 'db',
    connector: 'mongodb',
    database: process.env.MONGO_COLLECTION || 'aloes_local',
    host: process.env.MONGO_HOST || 'localhost',
    port: Number(process.env.MONGO_PORT) || 27017,
    // auth: {
    //   user: process.env.MONGO_USER,
    //   password: process.env.MONGO_PASS,
    // },
    useNewUrlParser: true,
    lazyConnect: true,
    maxDepthOfQuery: 12,
    maxDepthOfData: 32,
    allowExtendedOperators: true,
    enableGeoIndexing: true,
    // useUnifiedTopology: true,
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
    db: process.env.REDIS_COLLECTIONS || '3',
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    name: 'cache',
    connector: 'kv-redis',
    password: process.env.REDIS_PASS,
    lazyConnect: true,
  },
  points: {
    name: 'points',
    connector: 'influxdata',
    username: process.env.INFLUXDB_USER,
    password: process.env.INFLUXDB_USER_PASSWORD,
    database: process.env.INFLUXDB_DB || 'aloes_local',
    host: process.env.INFLUXDB_HOST || 'localhost',
    port: Number(process.env.INFLUXDB_PORT) || 8086,
    protocol: process.env.INFLUXDB_PROTOCOL || 'http',
    failoverTimeout: 60000,
    maxRetries: 5,
    timePrecision: 'ms',
  },
  timer: {
    name: 'timer',
    connector: 'rest',
    baseURL: process.env.TIMER_SERVER_URL || 'http://localhost:3000/timer',
    debug: true,
    options: {
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      strictSSL: false,
    },
    operations: [
      {
        template: {
          method: 'POST',
          url: `${process.env.TIMER_SERVER_URL || 'http://localhost:3000/timer'}`,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
          },
          body: '{instance}',
        },
        functions: {
          create: ['instance'],
        },
      },
      {
        template: {
          method: 'POST', // 'PUT'
          url: `${process.env.TIMER_SERVER_URL || 'http://localhost:3000/timer'}/{timerId}`,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
          },
          body: '{instance}',
        },
        functions: {
          updateById: ['timerId', 'instance'],
        },
      },
      {
        template: {
          method: 'DELETE',
          url: `${process.env.TIMER_SERVER_URL || 'http://localhost:3000/timer'}/{timerId}`,
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
          },
        },
        functions: {
          deleteById: ['timerId'],
        },
      },
    ],
  },
  storage: {
    name: 'storage',
    connector: 'loopback-component-storage',
    provider: 'filesystem',
    root: process.env.FS_PATH || './storage',
    // root: path.join(__dirname, process.env.FS_PATH || '../storage')
    nameConflict: 'makeUnique',
    maxFileSize: '10428800',
  },
};
