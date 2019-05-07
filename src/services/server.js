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
 * Bootstrap the application, configure models, datasources and middleware.
 * @method module:Server.init
 * @param {object} config - Parsed env variables
 */
app.init = config => {
  try {
    const options = {
      appRootDir: config.appRootDir,
      // File Extensions for jest (strongloop/loopback#3204)
      scriptExtensions: config.scriptExtensions,
    };
    return boot(app, options, err => {
      if (err) throw err;
      // if (require.main === module) {
      //   app.start(config);
      // }
      app.start(config);
    });
  } catch (error) {
    return error;
  }
};

/**
 * Close the app and services
 * @method module:Server.stop
 */
app.close = async () => {
  try {
    logger.publish(2, 'loopback', 'Close', `${process.env.NODE_NAME}-${process.env.NODE_ENV}`);
    if (app.broker) {
      await broker.close(app);
    }
    if (app.tunnel) {
      await tunnel.close(app);
    }
    if (httpServer) {
      await httpServer.close();
    }
    return app.emit('closed');
  } catch (error) {
    return error;
  }
};

/**
 * Emit publish event
 * @method module:Server.publish
 */
app.publish = (topic, payload, qos, retain) => {
  app.emit('publish', topic, payload, qos, retain);
};

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

    if (config.TUNNEL_URL) {
      await tunnel.init(app, config);
      logger.publish(2, 'tunnel', 'opened', app.tunnel);
    }

    httpServer = app.listen(() => {
      app.emit('started');
      logger.publish(2, 'loopback', 'Setup', `${config.NODE_NAME} / ${config.NODE_ENV}`);
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

    if (config.MQTT_BROKER_URL) {
      await broker.init(app, httpServer);
    }

    return httpServer;
  } catch (error) {
    return error;
  }
};

export default app;
