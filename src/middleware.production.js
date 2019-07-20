// const domainsWhitelist = [
//   'http://localhost:8000',
//   /\.github\.com$/,
//   process.env.HTTP_SERVER_URL,
//   process.env.HTTP_CLIENT_URL,
// ];

module.exports = {
  initial: {
    './middleware/tracker': {
      params: { enabled: false },
    },
    compression: {},
    cors: {
      params: {
        //  origin: domainsWhitelist,
        origin: true,
        credentials: true,
        maxAge: 86400,
        //  allowedHeaders: ['X-Requested-With', 'Content-Type', 'Authorization'],
      },
    },
  },
  session: {},
  auth: {},
  parse: {
    'body-parser#json': {
      verify: (req, res, buf) => {
        req.rawBody = buf;
      },
    },
  },
  'final:after': {
    './middleware/log-error': {
      params: { enabled: false },
    },
    'strong-error-handler': {
      params: {
        debug: false,
        log: false,
        safeFields: ['errorCode'],
      },
    },
  },
};
