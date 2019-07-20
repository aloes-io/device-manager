import dotenv from 'dotenv';
import fallback from 'express-history-api-fallback';
import flash from 'express-flash';
import nodeCleanup from 'node-cleanup';
import path from 'path';
import app from './services/server';
import logger from './services/logger';

const client = path.resolve(__dirname, '/../client');

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

app.on('started', () => {
  const baseUrl = app.get('url').replace(/\/$/, '');
  logger.publish(4, 'loopback', 'Setup', `Browse ${process.env.NODE_NAME} API @: ${baseUrl}`);
  if (app.get('loopback-component-explorer')) {
    const explorerPath = app.get('loopback-component-explorer').mountPath;
    logger.publish(4, 'loopback', 'Setup', `Explore REST API @: ${baseUrl}${explorerPath}`);
  }
  //  process.send('ready');
});

app.on('stopped', signal => {
  logger.publish(4, 'loopback', 'stopped', signal);
  setTimeout(() => process.exit(0), 5000);
});

const boot = async () => {
  try {
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
      const state = await app.init(config);
      logger.publish(4, 'loopback', 'boot:res', state);
      return state;
    }
    return app;
  } catch (error) {
    logger.publish(4, 'loopback', 'boot:error', error);
    return error;
  }
};

boot();

process.on('exit', exitCode => {
  logger.publish(4, 'process', 'exited', exitCode);
});

nodeCleanup((exitCode, signal) => {
  try {
    if (signal && signal !== null) {
      logger.publish(4, 'process', 'exit:req', { exitCode, signal, pid: process.pid });
      app.stop(signal, err => {
        if (err) throw err;
      });
      nodeCleanup.uninstall(); // don't call cleanup handler again
      return false;
    }
    return true;
  } catch (error) {
    logger.publish(4, 'process', 'exit:err', error);
    process.exit(1);
    return error;
  }
});

export default app;
