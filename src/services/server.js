import loopback from 'loopback';
import boot from 'loopback-boot';
//  import cookieParser from 'cookie-parser';
//  import {ensureLoggedIn} from 'connect-ensure-login';
//  import session from 'express-session';
import broker from './broker';
import tunnel from './tunnel';
import logger from './logger';

/**
 * @module Server
 */
let httpServer;
const app = loopback();

/**
 * Init HTTP server with new Loopback instance
 *
 * Init external services ( MQTT broker, tunnel )
 * @method module:Server.start
 * @param {object} config - Parsed env variables
 * @returns {object} httpServer
 */
app.start = async config => {
  try {
    app.set('originUrl', config.HTTP_SERVER_URL);
    app.set('url', config.HTTP_SERVER_URL);
    app.set('host', config.HOST);
    app.set('port', Number(config.PORT));
    //  app.set('cookieSecret', config.COOKIE_SECRET);
    logger.publish(2, 'loopback', 'start', `${app.get('host')}:${app.get('port')}`);

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
    //       domain: config.DOMAIN,
    //       maxAge: 1000 * 60 * 24,
    //     },
    //   }),
    // );

    httpServer = app.listen(() => {
      app.emit('started');

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
        res.redirect(`${config.HTTP_CLIENT_URL}/login`);
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

    if (config.TUNNEL_URL) {
      await tunnel.init(app, config);
    }

    if (config.MQTT_BROKER_URL) {
      await broker.init(app, httpServer, config);
    }

    return httpServer;
  } catch (error) {
    logger.publish(2, 'loopback', 'start:err', error);
    return error;
  }
};

/**
 * Close the app and services
 * @method module:Server.stop
 */
app.stop = async signal => {
  try {
    logger.publish(2, 'loopback', 'stop', `${process.env.NODE_NAME}-${process.env.NODE_ENV}`);
    await broker.stop(app);
    if (app.tunnel) {
      await tunnel.stop(app);
    }
    await app.models.Device.syncCache();
    return setTimeout(() => {
      app.emit('stopped', signal);
      httpServer.close(err => {
        if (err) throw err;
      });
      return true;
    }, 2000);
  } catch (error) {
    logger.publish(2, 'loopback', 'stop:err', error);
    return error;
  }
};

/**
 * Emit publish event
 * @method module:Server.publish
 */
app.publish = (topic, payload, retain = false, qos = 0) => {
  app.emit('publish', topic, payload, retain, qos);
};

/**
 * Bootstrap the application, configure models, datasources and middleware.
 * @method module:Server.init
 * @param {object} config - Parsed env variables
 */
app.init = config => {
  try {
    logger.publish(2, 'loopback', 'init', `${config.NODE_NAME} / ${config.NODE_ENV}`);
    const options = {
      appRootDir: config.appRootDir,
      // File Extensions for jest (strongloop/loopback#3204)
      scriptExtensions: config.scriptExtensions,
    };
    boot(app, options, err => {
      if (err) throw err;
      //  if (require.main === module) {
      //  app.start(config);
      //  }
    });
    return app.start(config);
  } catch (error) {
    logger.publish(2, 'loopback', 'init:err', error);
    return error;
  }
};

export default app;
