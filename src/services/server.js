/* Copyright 2020 Edouard Maleix, read LICENSE */

import flash from 'express-flash';
import fallback from 'express-history-api-fallback';
import loopback from 'loopback';
import boot from 'loopback-boot';
import explorer from 'loopback-component-explorer';
import path from 'path';
//  import {ensureLoggedIn} from 'connect-ensure-login';
import logger from './logger';
import MQTTClient from './mqtt-client';

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

/**
 * Init HTTP server with new Loopback instance
 *
 * Init external services ( MQTT broker )
 * @method module:Server~authenticateInstance
 * @param {object} client - Parsed MQTT client
 * @param {string} username - MQTT client username
 * @param {object} password - MQTT client password (buffer)
 * @returns {object}
 */
const authenticateInstance = async (client, username, password) => {
  const Client = app.models.Client;
  let status, foundClient;
  if (!client || !client.id) return { client: null, status: 1 };
  // todo : find a way to verify in auth request, against which model
  // authenticate
  try {
    const savedClient = JSON.parse(await Client.get(client.id));
    if (!savedClient || !savedClient.model) {
      foundClient = client;
    } else {
      foundClient = { ...savedClient, ...client };
    }
  } catch (e) {
    foundClient = client;
  }

  try {
    let token, authentification, foundUsername;
    // User login
    try {
      token = await app.models.accessToken.findById(password.toString());
    } catch (e) {
      token = null;
    }
    if (token && token.userId && token.userId.toString() === username) {
      status = 0;
      foundClient.ownerId = token.userId.toString();
      foundClient.user = username;
      foundClient.model = 'User';
    } else {
      const user = await app.models.user.findById(username);
      if (user && user.id) foundUsername = username;
    }

    // Device auth
    if (status !== 0) {
      try {
        authentification = await app.models.Device.authenticate(username, password.toString());
      } catch (e) {
        if (e.statusCode === 403 && e.message === 'UNAUTHORIZED') {
          foundUsername = username;
        }
        authentification = null;
      }
      if (authentification && authentification.device && authentification.keyType) {
        const instance = authentification.device;
        status = 0;
        foundClient.devEui = instance.devEui;
        foundClient.user = username;
        foundClient.model = 'Device';
      }
    }

    // Application auth
    if (status !== 0) {
      try {
        authentification = await app.models.Application.authenticate(username, password.toString());
      } catch (e) {
        if (e.statusCode === 403 && e.message === 'UNAUTHORIZED') {
          foundUsername = username;
        }
        authentification = null;
      }
      if (authentification && authentification.application && authentification.keyType) {
        const instance = authentification.application;
        foundClient.appId = instance.id.toString();
        foundClient.user = username;
        foundClient.model = 'Application';
        foundClient.appEui = instance.appEui || null;
        status = 0;
      }
    }

    if (status !== 0 && foundUsername) {
      foundClient.user = foundUsername;
      status = 4;
    } else if (status === undefined) {
      status = 2;
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

/**
 * Init HTTP server with new Loopback instance
 *
 * Init external services ( MQTT broker )
 * @method module:Server.start
 * @param {object} config - Parsed env variables
 * @fires Server.started
 * @returns {boolean}
 */
app.start = config => {
  app.set('url', config.HTTP_SERVER_URL);
  app.set('host', config.HTTP_SERVER_HOST);
  app.set('port', Number(config.HTTP_SERVER_PORT));
  //  app.set('cookieSecret', config.COOKIE_SECRET);

  // if (config.MQTTS_BROKER_URL && config.MQTTS_BROKER_URL.length > 1) {
  //   app.set('mqtt url', config.MQTTS_BROKER_URL);
  //   app.set('mqtt port', Number(config.MQTTS_BROKER_PORT));
  // } else {
  //   app.set('mqtt url', config.MQTT_BROKER_URL);
  //   app.set('mqtt port', Number(config.MQTT_BROKER_PORT));
  // }
  app.set('mqtt url', config.MQTTS_BROKER_URL || config.MQTT_BROKER_URL);
  app.set('mqtt port', Number(config.MQTTS_BROKER_PORT || config.MQTT_BROKER_PORT));

  app.set('view engine', 'ejs');
  app.set('json spaces', 2); // format json responses for easier viewing
  app.set('views', path.join(__dirname, 'views'));

  // specify multiple subnets as an array
  // app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
  app.set('trust proxy', ip => {
    if (config.HTTP_TRUST_PROXY && config.HTTP_TRUST_PROXY === 'true') {
      logger.publish(2, 'loopback', 'proxy:req', { ip });
      // if (ip === '127.0.0.1' || ip === '123.123.123.123') return true;
      // todo : set trusted IPs
      return true;
    }
    return false;
  });

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

  httpServer = app.listen(() => {
    // EXTERNAL AUTH
    //  app.get('/auth/account', ensureLoggedIn('/login'), (req, res, next) => {
    // app.get('/auth/account', (req, res, next) => {
    //   console.log('auth/account', req.url);
    //   res.set('Access-Control-Allow-Origin', '*');
    //   res.end();
    //   // get origin
    //   // compose user + access token res
    //   //  console.log("user", req.user)
    //   // how to redirect ?
    //   //  res.redirect(`${process.env.HTTP_CLIENT_URL}`);
    //   //  res.redirect(`${process.env.HTTP_CLIENT_URL}/account?userId=${res.id}?token=${}`);
    //   //  res.json()
    //   next();
    // });

    // app.get('/login', (req, res, next) => {
    //   console.log('login', req.url);
    //   res.redirect(`${config.HTTP_CLIENT_URL}/login`);
    //   next();
    // });

    // app.get(`${apiPath}/auth/logout`, (req, res, next) => {
    //   console.log('auth/logout', req.url);
    //   req.logout();
    //   res.set('Access-Control-Allow-Origin', '*');
    //   res.end();
    //   next();
    // });

    app.post(`${apiPath}/auth/mqtt`, async (req, res) => {
      // console.log('auth/mqtt', req.url, req.body);
      const client = req.body.client;
      const username = req.body.username;
      const password = req.body.password;
      const result = await authenticateInstance(client, username, password);
      res.set('Access-Control-Allow-Origin', '*');
      return res.json(result);
    });

    app.emit('started', config);
  });

  return true;
};

/**
 * Bootstrap the application, configure models, datasources and middleware.
 * @method module:Server.init
 * @param {object} config - Parsed env variables
 */
app.init = async config => {
  logger.publish(2, 'loopback', 'init', `${config.NODE_NAME} / ${config.NODE_ENV}`);
  await bootApp(app, {
    appRootDir: config.appRootDir,
    scriptExtensions: config.scriptExtensions,
  });
  // if (require.main === module) {
  //   return app.start(config);
  // }
  // app.version = config.version;
  return app.start(config);
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
 * @param {object} config - application config
 * @fires MQTTClient.init
 * @fires Device.started
 * @fires Scheduler.started
 * @fires Sensor.started
 */
app.on('started', config => {
  app.bootState = true;
  const baseUrl = app.get('url').replace(/\/$/, '');
  logger.publish(4, 'loopback', 'Setup', `Browse ${process.env.NODE_NAME} API @: ${baseUrl}`);
  if (app.get('loopback-component-explorer')) {
    explorer(app, {
      // basePath: '/custom-api-root',
      uiDirs: [
        // path.resolve(__dirname, 'public'),
        path.resolve(__dirname, '../node_modules', 'swagger-ui'),
      ],
      apiInfo: {
        title: 'Aloes API',
        description: 'Explorer and tester for Aloes HTTP API',
      },
      // resourcePath: 'swagger.json',
      // version: process.env.REST_API_VERSION,
    });
    const explorerPath = app.get('loopback-component-explorer').mountPath;
    logger.publish(4, 'loopback', 'Setup', `Explore REST API @: ${baseUrl}${explorerPath}`);
  }

  MQTTClient.emit('init', app, config);
  app.models.Scheduler.emit('started');
  app.models.Device.emit('started');
  app.models.Sensor.emit('started');
  //  process.send('ready');
});

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
  logger.publish(2, 'loopback', 'stopping', signal);
  MQTTClient.emit('stop');
  app.models.Application.emit('stopped');
  app.models.Device.emit('stopped');
  app.models.Client.emit('stopped');
  app.models.Scheduler.emit('stopped');
  app.bootState = false;
  if (httpServer) {
    await httpServer.close();
  }
  logger.publish(2, 'loopback', 'stopped', `${process.env.NODE_NAME}-${process.env.NODE_ENV}`);
  return true;
};

/**
 * Event reporting that the application and all subservice should stop.
 * @event stop
 * @param {string} signal - process signal
 * @returns {function} Server.stop
 */
app.on('stop', app.stop);

export default app;
