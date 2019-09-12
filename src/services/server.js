import loopback from 'loopback';
import boot from 'loopback-boot';
import fallback from 'express-history-api-fallback';
import flash from 'express-flash';
import path from 'path';
//  import {ensureLoggedIn} from 'connect-ensure-login';
import mqttClient from './mqtt-client';
import logger from './logger';

/**
 * @module Server
 */
let httpServer;
const app = loopback();

const unless = (paths, middleware) => (req, res, next) => {
  if (paths.some(p => req.path.indexOf(p) > -1)) {
    return next();
  }
  return middleware(req, res, next);
};

const authenticateInstance = async (client, username, password) => {
  const Client = app.models.Client;
  try {
    // todo : find a way to verify in auth request, against which model authenticate
    //  console.log("client parser", client.parser)
    let status = false;
    let foundClient = JSON.parse(await Client.get(client.id));
    let successPayload = status.toString();

    if (!foundClient || !foundClient.id) {
      foundClient = { id: client.id, type: 'MQTT' };
    }
    const token = await app.models.accessToken.findById(password.toString());
    if (token && token.userId && token.userId.toString() === username) {
      status = true;
      successPayload = token;
      foundClient.ownerId = token.userId.toString();
      foundClient.model = 'User';
      // console.log('OWNER MQTT CLIENT', Object.keys(foundClient));
    }

    let authentification;
    if (!status) {
      authentification = await app.models.Device.authenticate(username, password.toString());
      if (authentification && authentification.device && authentification.keyType) {
        const instance = authentification.device;
        if (instance.devEui && instance.devEui !== null) {
          status = true;
          successPayload = instance;
          foundClient.devEui = instance.devEui;
          foundClient.model = 'Device';
        }
      }
    }

    if (!status) {
      authentification = await app.models.Application.authenticate(username, password.toString());
      if (authentification && authentification.application && authentification.keyType) {
        const instance = authentification.application;
        if (instance && instance.id) {
          foundClient.appId = instance.id.toString();
          foundClient.model = 'Application';
          successPayload = instance;
          status = true;
          if (instance.appEui && instance.appEui !== null) {
            foundClient.appEui = instance.appEui;
          }
        }
      }
    }

    if (status) {
      if (!successPayload) {
        successPayload = status.toString();
      }
      const ttl = 1 * 60 * 60 * 1000;
      client.user = username;
      foundClient.user = username;
      await Client.set(client.id, JSON.stringify(foundClient), ttl);
    }

    return { client: foundClient, status, payload: successPayload };
  } catch (error) {
    return error;
  }
};

/**
 * Init HTTP server with new Loopback instance
 *
 * Init external services ( MQTT broker )
 * @method module:Server.start
 * @param {object} config - Parsed env variables
 * @fires module:app.started
 * @returns {object} httpServer
 */
app.start = async config => {
  try {
    let baseUrl = `${config.HTTP_SERVER_URL}`;
    if (config.TUNNEL_HOST) {
      if (config.TUNNEL_SECURE) {
        baseUrl = `https://${config.NODE_NAME}-${config.NODE_ENV}.${config.TUNNEL_HOST}`;
      } else {
        baseUrl = `http://${config.NODE_NAME}-${config.NODE_ENV}.${config.TUNNEL_HOST}`;
      }
    }
    app.set('originUrl', config.HTTP_SERVER_URL);
    app.set('url', baseUrl);
    app.set('host', config.HTTP_SERVER_HOST);
    app.set('port', Number(config.HTTP_SERVER_PORT));
    //  app.set('cookieSecret', config.COOKIE_SECRET);

    app.set('view engine', 'ejs');
    app.set('json spaces', 2); // format json responses for easier viewing
    app.set('views', path.join(__dirname, 'views'));

    app.use(flash());

    const clientPath = path.resolve(__dirname, '/../client');
    app.use(
      unless(
        [config.REST_API_ROOT, '/auth', '/explorer', '/components'],
        fallback('index.html', { root: clientPath }),
      ),
    );

    // logger.publish(2, 'loopback', 'start', `${app.get('host')}:${app.get('port')}`);
    logger.publish(2, 'loopback', 'start', `${app.get('url')}`);

    // app.use(
    //   loopback.token({
    //     model: app.models.accessToken,
    //   }),
    // );

    httpServer = app.listen(() => {
      app.emit('started');

      // EXTERNAL AUTH TESTS
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

      app.post('/api/auth/mqtt', async (req, res, next) => {
        try {
          console.log('auth/mqtt', req.url, req.body);
          const client = req.body.client;
          const username = req.body.username;
          const password = req.body.password;
          const result = await authenticateInstance(client, username, password);
          res.set('Access-Control-Allow-Origin', '*');
          res.json(result);
          return next();
        } catch (error) {
          return next(error);
        }
      });
    });

    if (config.MQTT_BROKER_URL) {
      await mqttClient.init(app, config);
    }

    return true;
  } catch (error) {
    logger.publish(2, 'loopback', 'start:err', error);
    return false;
  }
};

/**
 * Close the app and services
 * @method module:Server.stop
 */
app.stop = async () => {
  try {
    if (httpServer) {
      httpServer.close();
    }
    if (process.env.MQTT_BROKER_URL) {
      await mqttClient.stop();
    }
    app.models.Scheduler.emit('stopped');
    app.models.Device.emit('stopped');
    app.models.Application.emit('stopped');
    app.models.Client.emit('stopped');
    logger.publish(2, 'loopback', 'stopped', `${process.env.NODE_NAME}-${process.env.NODE_ENV}`);
    return true;
  } catch (error) {
    logger.publish(2, 'loopback', 'stop:err', error);
    return false;
  }
};

/**
 * Emit publish event
 * @method module:Server.publish
 * @fires module:app.publish
 */
app.publish = async (topic, payload, retain = false, qos = 0) => {
  try {
    await mqttClient.publish(topic, payload, retain, qos);
    return true;
  } catch (error) {
    return error;
  }
};

app.on('publish', async (topic, payload, retain = false, qos = 0) =>
  app.publish(topic, payload, retain, qos),
);

const bootApp = (loopbackApp, options) =>
  new Promise((resolve, reject) => {
    boot(loopbackApp, options, err => (err ? reject(err) : resolve(true)));
  });

/**
 * Bootstrap the application, configure models, datasources and middleware.
 * @method module:Server.init
 * @param {object} config - Parsed env variables
 */
app.init = async config => {
  try {
    logger.publish(2, 'loopback', 'init', `${config.NODE_NAME} / ${config.NODE_ENV}`);
    const options = {
      appRootDir: config.appRootDir,
      // File Extensions for jest (strongloop/loopback#3204)
      scriptExtensions: config.scriptExtensions,
    };
    await bootApp(app, options);
    //  logger.publish(4, 'loopback', 'init:res', state);
    if (require.main === module) {
      return app.start(config);
    }
    // return app.start(config);
    return true;
  } catch (error) {
    logger.publish(2, 'loopback', 'init:err', error);
    return false;
  }
};

export default app;
