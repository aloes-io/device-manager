import loopback from 'loopback';
import boot from 'loopback-boot';
import fallback from 'express-history-api-fallback';
import flash from 'express-flash';
import path from 'path';
//  import {ensureLoggedIn} from 'connect-ensure-login';
import MQTTClient from './mqtt-client';
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
  let status, foundClient;
  if (!client || !client.id) return { client: null, status: 1 };
  try {
    // todo : find a way to verify in auth request, against which model authenticate
    //  console.log("client parser", client.parser)
    let token, authentification;
    try {
      foundClient = JSON.parse(await Client.get(client.id));
      if (!foundClient || !foundClient.id) {
        if (!client.req) {
          foundClient = { id: client.id, type: 'MQTT' };
        } else {
          foundClient = { id: client.id, type: 'WS' };
        }
      }
    } catch (e) {
      if (!client.req) {
        foundClient = { id: client.id, type: 'MQTT' };
      } else {
        foundClient = { id: client.id, type: 'WS' };
      }
    }

    try {
      token = await app.models.accessToken.findById(password.toString());
    } catch (e) {
      token = null;
    }
    if (token && token.userId && token.userId.toString() === username) {
      status = 0;
      foundClient.ownerId = token.userId.toString();
      foundClient.model = 'User';
    } else {
      status = 4;
    }

    if (status !== 0) {
      try {
        authentification = await app.models.Device.authenticate(username, password.toString());
      } catch (e) {
        authentification = null;
      }
      if (authentification && authentification.device && authentification.keyType) {
        const instance = authentification.device;
        if (instance.devEui && instance.devEui !== null) {
          status = 0;
          foundClient.devEui = instance.devEui;
          foundClient.model = 'Device';
        }
      } else {
        status = 4;
      }
    }

    if (status !== 0) {
      try {
        authentification = await app.models.Application.authenticate(username, password.toString());
      } catch (e) {
        authentification = null;
      }
      if (authentification && authentification.application && authentification.keyType) {
        const instance = authentification.application;
        if (instance && instance.id) {
          foundClient.appId = instance.id.toString();
          foundClient.model = 'Application';
          // status = true;
          status = 0;
          if (instance.appEui && instance.appEui !== null) {
            foundClient.appEui = instance.appEui;
          }
        }
      } else {
        status = 4;
      }
    }

    if (status === 0) {
      // const ttl = 1 * 60 * 60 * 1000;
      foundClient.user = username;
      // await Client.set(client.id, JSON.stringify(foundClient), ttl);
    }
    logger.publish(3, 'loopback', 'authenticateInstance:res', { status, client: foundClient });
    return { client: foundClient, status };
  } catch (error) {
    logger.publish(2, 'loopback', 'authenticateInstance:err', error);
    status = 2;
    return { client: foundClient, status };
  }
};

/**
 * Init HTTP server with new Loopback instance
 *
 * Init external services ( MQTT broker )
 * @method module:Server.start
 * @param {object} config - Parsed env variables
 * @fires Server.started
 * @returns {boolean}
 */
app.start = async config => {
  try {
    app.set('url', config.HTTP_SERVER_URL);
    app.set('host', config.HTTP_SERVER_HOST);
    app.set('port', Number(config.HTTP_SERVER_PORT));
    //  app.set('cookieSecret', config.COOKIE_SECRET);

    if (config.MQTTS_BROKER_URL) {
      app.set('mqtt url', config.MQTTS_BROKER_URL);
      app.set('mqtt port', Number(config.MQTTS_BROKER_PORT));
    } else {
      app.set('mqtt url', config.MQTT_BROKER_URL);
      app.set('mqtt port', Number(config.MQTT_BROKER_PORT));
    }

    app.set('view engine', 'ejs');
    app.set('json spaces', 2); // format json responses for easier viewing
    app.set('views', path.join(__dirname, 'views'));

    app.use(flash());

    const clientPath = path.resolve(__dirname, '/../client');
    const apiPath = config.REST_API_ROOT;
    // const apiPath = `${config.REST_API_ROOT}${config.REST_API_VERSION}`;
    app.use(
      unless(
        [apiPath, '/auth', '/link', '/explorer', '/components'],
        fallback('index.html', { root: clientPath }),
      ),
    );

    logger.publish(2, 'loopback', 'start', `${app.get('url')}`);

    // app.use(
    //   loopback.token({
    //     model: app.models.accessToken,
    //   }),
    // );
    // await startServer();

    httpServer = app.listen(() => {
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

      app.get(`${apiPath}/auth/logout`, (req, res, next) => {
        console.log('auth/logout', req.url);
        req.logout();
        res.set('Access-Control-Allow-Origin', '*');
        res.end();
        next();
      });

      app.post(`${apiPath}/auth/mqtt`, async (req, res) => {
        try {
          // console.log('auth/mqtt', req.url, req.body);
          const client = req.body.client;
          const username = req.body.username;
          const password = req.body.password;
          const result = await authenticateInstance(client, username, password);
          res.set('Access-Control-Allow-Origin', '*');
          res.json(result);
          return;
        } catch (error) {
          throw error;
        }
      });

      app.emit('started', true, config);
    });

    return true;
  } catch (error) {
    logger.publish(2, 'loopback', 'start:err', error);
    app.emit('started', false);
    return null;
  }
};

/**
 * Close the app and services
 * @method module:Server.stop
 * @param {string} signal - process signal
 * @fires MQTTClient.stop
 * @fires Scheduler.stopped
 * @fires Application.stopped
 * @fires Device.stopped
 * @fires Client.stopped
 * @returns {boolean}
 */
app.stop = async signal => {
  try {
    logger.publish(2, 'loopback', 'stopping', signal);
    MQTTClient.emit('stop');
    app.models.Application.emit('stopped');
    app.models.Device.emit('stopped');
    app.models.Client.emit('stopped');
    app.models.Scheduler.emit('stopped');
    app.bootState = false;
    if (httpServer) httpServer.close();
    logger.publish(2, 'loopback', 'stopped', `${process.env.NODE_NAME}-${process.env.NODE_ENV}`);
    return true;
  } catch (error) {
    logger.publish(2, 'loopback', 'stop:err', error);
    return null;
  }
};

/**
 * Emit publish event
 * @method module:Server.publish
 * @returns {function} MQTTClient.publish
 */
app.publish = async (topic, payload, retain = false, qos = 0) =>
  MQTTClient.publish(topic, payload, retain, qos);

app.on('publish', async (topic, payload, retain = false, qos = 0) =>
  app.publish(topic, payload, retain, qos),
);

const bootApp = (loopbackApp, options) =>
  new Promise((resolve, reject) => {
    boot(loopbackApp, options, err => (err ? reject(err) : resolve(true)));
  });

app.isStarted = () => app.bootState;

/**
 * Bootstrap the application, configure models, datasources and middleware.
 * @method module:Server.init
 * @param {object} config - Parsed env variables
 */
app.init = async config => {
  try {
    logger.publish(2, 'loopback', 'init', `${config.NODE_NAME} / ${config.NODE_ENV}`);
    await bootApp(app, {
      appRootDir: config.appRootDir,
      scriptExtensions: config.scriptExtensions,
    });
    // if (require.main === module) {
    //   return app.start(config);
    // }
    return app.start(config);
  } catch (error) {
    logger.publish(2, 'loopback', 'init:err', error);
    return null;
  }
};

/**
 * Event reporting that the application and all subservices should start.
 * @event start
 * @param {object} config - Parsed env variables
 * @returns {function} Server.init
 */
app.on('start', app.init);

/**
 * Event reporting that the application and all subservices have started.
 * @event started
 * @param {boolean} state - application state
 * @param {object} config - application config
 * @fires MQTTClient.start
 * @fires Scheduler.started
 */
app.on('started', (state, config) => {
  app.bootState = state;
  if (state) {
    const baseUrl = app.get('url').replace(/\/$/, '');
    logger.publish(4, 'loopback', 'Setup', `Browse ${process.env.NODE_NAME} API @: ${baseUrl}`);
    if (app.get('loopback-component-explorer')) {
      const explorerPath = app.get('loopback-component-explorer').mountPath;
      logger.publish(4, 'loopback', 'Setup', `Explore REST API @: ${baseUrl}${explorerPath}`);
    }
    MQTTClient.emit('init', app, config);
    app.models.Scheduler.emit('started');
    //  process.send('ready');
  } else {
    logger.publish(4, 'loopback', 'Setup', `Error, state invalid`);
    //  app.emit('error');
    //  process.send('error');
  }
});

/**
 * Event reporting that the application and all subservice should stop.
 * @event stop
 * @param {string} signal - process signal
 * @returns {function} Server.stop
 */
app.on('stop', app.stop);

export default app;
