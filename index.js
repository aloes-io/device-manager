import bodyParser from 'body-parser';
//  import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import fallback from 'express-history-api-fallback';
import flash from 'express-flash';
import path from 'path';
//  import session from 'express-session';
import app from './src/server';
import logger from './src/services/logger';

const result = dotenv.config();
if (result.error) {
  throw result.error;
}

const client = path.resolve(__dirname, 'client');

const unless = (paths, middleware) => (req, res, next) => {
  if (paths.some(p => req.path.indexOf(p) > -1)) {
    return next();
  }
  return middleware(req, res, next);
};

// enable redirect urls to index
app.use(
  unless(
    [process.env.REST_API_ROOT, '/auth', '/explorer', '/components'],
    fallback('index.html', { root: client }),
  ),
);

app.set('url', result.parsed.HTTP_SERVER_URL);
app.set('host', result.parsed.HOST);
app.set('port', Number(result.parsed.PORT));
app.set('view engine', 'ejs');
app.set('json spaces', 2); // format json responses for easier viewing
app.set('views', path.join(__dirname, 'views'));
//  app.set('cookieSecret', result.parsed.COOKIE_SECRET);

app.use(flash());

app.middleware(
  'parse',
  bodyParser.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.middleware(
  'parse',
  bodyParser.urlencoded({
    extended: true,
  }),
);

// app.middleware('session:before', cookieParser(app.get('cookieSecret')));
// app.middleware(
//   'session',
//   session({
//     //  secret: 'kitty',
//     //  store: initializeRedis(Session),
//     saveUninitialized: true,
//     resave: true,
//     cookie: {
//       path: '/',
//       domain: result.parsed.DOMAIN,
//       maxAge: 1000 * 60 * 24,
//     },
//   }),
// );

app.on('started', () => {
  const baseUrl = app.get('url').replace(/\/$/, '');
  logger.publish(4, 'loopback', 'Setup', `Browse ${process.env.APP_NAME} API @: ${baseUrl}`);
  if (app.get('loopback-component-explorer')) {
    const explorerPath = app.get('loopback-component-explorer').mountPath;
    logger.publish(4, 'loopback', 'Setup', `Explore REST API @: ${baseUrl}${explorerPath}`);
  }
  //  process.send('ready');
});

if (require.main === module) {
  app.start();
}

export default app;
