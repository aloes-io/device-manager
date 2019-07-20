//  import cookieParser from 'cookie-parser';
//  import session from 'express-session';
//  import redistStore from 'connect-redis';

// const domainsWhitelist = [
//   'http://localhost:8000',
//   /\.github\.com$/,
//   process.env.HTTP_SERVER_URL,
//   process.env.HTTP_CLIENT_URL,
// ];

module.exports = {
  initial: {
    './middleware/tracker': {
      params: { enabled: true },
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
  //  'session:before': cookieParser(process.env.COOKIE_SECRET),
  // session: session({
  //   //  secret: process.env.SESSION_SECRET,
  //   //  store: redistStore(session),
  //   saveUninitialized: true,
  //   resave: true,
  //   cookie: {
  //     path: '/',
  //     domain: config.DOMAIN,
  //     maxAge: 1000 * 60 * 24,
  //   },
  // }),
  auth: {},
  parse: {
    'body-parser#json': {
      verify: (req, res, buf) => {
        req.rawBody = buf;
      },
    },
  },
};
