import loopback from 'loopback';
import boot from 'loopback-boot';
//  import {ensureLoggedIn} from 'connect-ensure-login';
import nodeCleanup from 'node-cleanup';
import broker from './services/broker';
import logger from './services/logger';

const app = loopback();
const options = {
  appRootDir: __dirname,
  // File Extensions for jest (strongloop/loopback#3204)
  scriptExtensions: ['.js', '.json', '.node', '.ejs'],
};

let httpServer;

app.start = () => {
  httpServer = app.listen(() => {
    app.emit('started');
    logger.publish(2, 'loopback', 'Setup', `${process.env.APP_NAME} / ${process.env.NODE_ENV}`);
    logger.publish(2, 'loopback', 'Setup', `config : ${app.get('host')}:${app.get('port')}`);
    const baseUrl = app.get('url').replace(/\/$/, '');
    logger.publish(2, 'loopback', 'Setup', `Express API server listening @: ${baseUrl}/api`);

    //  app.get('/auth/account', ensureLoggedIn('/login'), (req, res, next) => {
    app.get('/auth/account', (req, res, next) => {
      console.log('auth/account', req.url);
      res.set('Access-Control-Allow-Origin', '*');
      res.end();
      // get origin
      // compose user + access token res
      //  console.log("user", req.user)
      // how to redirect ?
      //  res.redirect(`${process.env.HTTP_CLIENT_URL}`);
      //  res.redirect(`${process.env.HTTP_CLIENT_URL}/account?userId=${res.id}?token=${}`);
      //  res.json()
      next();
    });

    app.get('/login', (req, res, next) => {
      console.log('login', req.url);
      res.redirect(`${process.env.HTTP_CLIENT_URL}/login`);
      next();
    });

    app.get('/api/auth/logout', (req, res, next) => {
      console.log('auth/logout', req.url);
      req.logout();
      res.set('Access-Control-Allow-Origin', '*');
      res.end();
      next();
    });
  });

  return httpServer;
};

app.on('started', () => {
  // app.middleware(
  //   'auth',
  //   loopback.token({
  //     model: app.models.accessToken,
  //   }),
  // );

  broker.init(app, httpServer);
});

app.close = async () => {
  try {
    logger.publish(2, 'loopback', 'Close', `${process.env.APP_NAME} / ${process.env.NODE_ENV}`);
    await broker.close(app);
    httpServer.close();
    return app.emit('closed');
  } catch (error) {
    return error;
  }
};

app.publish = (topic, payload, qos, retain) => {
  app.emit('publish', topic, payload, qos, retain);
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, options, err => {
  if (err) throw err;
  if (require.main === module) {
    app.start();
  }
});

nodeCleanup((exitCode, signal) => {
  if (signal) {
    app.close(err => {
      console.log('close app : ', exitCode, signal, err);
      process.kill(process.pid, signal);
    });
    nodeCleanup.uninstall(); // don't call cleanup handler again
    return false;
  }
  return true;
});

export default app;
