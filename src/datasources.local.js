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
    password: process.env.REDIS_PASS,
    lazyConnect: true,
  },
  points: {
    name: 'points',
    connector: 'influxdata',
    username: process.env.INFLUX_USER,
    password: process.env.INFLUX_PASS,
    database: process.env.INFLUX_COLLECTION || 'aloes_local',
    host: process.env.INFLUX_HOST || 'localhost',
    port: Number(process.env.INFLUX_PORT) || 8086,
    protocol: process.env.INFLUX_PROTOCOL || 'http',
    failoverTimeout: 60000,
    maxRetries: 5,
    timePrecision: 'ms',
  },
  // timer: {
  //   name: 'timer',
  //   connector: 'rest',
  //   baseURL: process.env.TIMER_BASE_URL || 'http://localhost:8002/timer',
  //   debug: true,
  //   options: {
  //     headers: {
  //       accept: 'application/json',
  //       'content-type': 'application/json',
  //       // apikey: process.env.APPLICATION_KEY,
  //       // appId: process.env.APPLICATION_ID,
  //     },
  //     strictSSL: false,
  //   },
  //   operations: [
  //     {
  //       template: {
  //         method: 'GET',
  //         url: `${process.env.TIMER_BASE_URL}/{timerId}`,
  //         headers: {
  //           accept: 'application/json',
  //           'content-type': 'application/json',
  //         },
  //       },
  //       functions: {
  //         getTimer: ['timerId'],
  //       },
  //     },
  //     {
  //       template: {
  //         method: 'POST',
  //         url: `${process.env.TIMER_BASE_URL}/{timerId}`,
  //         headers: {
  //           accept: 'application/json',
  //           'content-type': 'application/json',
  //         },
  //       },
  //       body: '{body}',
  //       functions: {
  //         createtimer: ['timerId', 'body'],
  //       },
  //     },
  //     {
  //       template: {
  //         method: 'DELETE',
  //         url: `${process.env.TIMER_BASE_URL}/{timerId}`,
  //         headers: {
  //           accept: 'application/json',
  //           'content-type': 'application/json',
  //         },
  //       },
  //       functions: {
  //         deleteTimer: ['timerId'],
  //       },
  //     },
  //   ],
  // },
  storage: {
    name: 'storage',
    connector: 'loopback-component-storage',
    provider: 'filesystem',
    root: process.env.FS_PATH || './storage',
    nameConflict: 'makeUnique',
    maxFileSize: '10428800',
  },
  coinhive: {
    name: 'coinhive',
    connector: 'rest',
    debug: true,
    operations: [
      {
        template: {
          method: 'POST',
          url: 'https://api.coinhive.com/{path}',
          headers: {
            accept: 'application/json',
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: '{body}',
        },
        functions: {
          verifyCaptcha: ['path', 'body'],
          createLink: ['path', 'body'],
        },
      },
    ],
  },
};
