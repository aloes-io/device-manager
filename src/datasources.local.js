module.exports = {
  db: {
    name: "db",
    connector: "mongodb",
    database: process.env.MONGO_COLLECTION,
    host: process.env.MONGO_HOST,
    port: Number(process.env.MONGO_PORT) || 27017,
    useNewUrlParser: true,
    lazyConnect: false,
    maxDepthOfQuery: 12,
    maxDepthOfData: 32,
    allowExtendedOperators: true,
    enableGeoIndexing: true,
  },
  email: {
    name: "email",
    connector: "mail",
    transports: [
      {
        type: "smtp",
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
  // redis: {
  //   name: 'redis',
  //   connector: 'redis',
  //   db: process.env.REDIS_COLLECTION || 'aloes_local',
  //   host: process.env.REDIS_HOST || 'localhost',
  //   port: Number(process.env.REDIS_PORT) || 6379,
  // },
  storage: {
    name: "storage",
    connector: "loopback-component-storage",
    provider: "filesystem",
    root: process.env.FS_PATH || "./storage",
    nameConflict: "makeUnique",
    maxFileSize: "10428800",
  },
  coinhive: {
    name: "coinhive",
    connector: "rest",
    debug: true,
    operations: [
      {
        template: {
          method: "POST",
          url: "https://api.coinhive.com/{path}",
          headers: {
            accept: "application/json",
            "content-type": "application/x-www-form-urlencoded",
          },
          body: "{body}",
        },
        functions: {
          verifyCaptcha: ["path", "body"],
          createLink: ["path", "body"],
        },
      },
    ],
  },
};
