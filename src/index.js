import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import fallback from 'express-history-api-fallback';
import flash from 'express-flash';
import nodeCleanup from 'node-cleanup';
import path from 'path';
import app from './services/server';
import logger from './services/logger';

const client = path.resolve(__dirname, 'client');

const unless = (paths, middleware) => (req, res, next) => {
  if (paths.some(p => req.path.indexOf(p) > -1)) {
    return next();
  }
  return middleware(req, res, next);
};

app.set('view engine', 'ejs');
app.set('json spaces', 2); // format json responses for easier viewing
app.set('views', path.join(__dirname, 'views'));

app.use(flash());
app.use(
  unless(
    [process.env.REST_API_ROOT, '/auth', '/explorer', '/components'],
    fallback('index.html', { root: client }),
  ),
);

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

app.on('started', () => {
  const baseUrl = app.get('url').replace(/\/$/, '');
  logger.publish(4, 'loopback', 'Setup', `Browse ${process.env.NODE_NAME} API @: ${baseUrl}`);
  if (app.get('loopback-component-explorer')) {
    const explorerPath = app.get('loopback-component-explorer').mountPath;
    logger.publish(4, 'loopback', 'Setup', `Explore REST API @: ${baseUrl}${explorerPath}`);
  }
  //  process.send('ready');
});

if (require.main === module) {
  const result = dotenv.config();
  if (result.error) {
    throw result.error;
  }
  const config = {
    ...result.parsed,
    appRootDir: __dirname,
    // File Extensions for jest (strongloop/loopback#3204)
    scriptExtensions: ['.js', '.json', '.node', '.ejs'],
  };
  app.init(config);
}

nodeCleanup((exitCode, signal) => {
  if (signal) {
    app.close(err => {
      console.log('close app : ', exitCode, signal, err);
      process.kill(process.pid, signal);
    });
    nodeCleanup.uninstall(); // don't call cleanup handler again
    return false;
  }
});

export default app;
