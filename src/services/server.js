/* Copyright 2020 Edouard Maleix, read LICENSE */

import axios from 'axios';
import { timingSafeEqual } from 'crypto';
import flash from 'express-flash';
import fallback from 'express-history-api-fallback';
import loopback from 'loopback';
import boot from 'loopback-boot';
import explorer from 'loopback-component-explorer';
import path from 'path';
//  import {ensureLoggedIn} from 'connect-ensure-login';
import logger from './logger';
import MQTTClient from './mqtt-client';
import rateLimiter from './rate-limiter';
import utils from '../lib/utils';

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

const getStoredClients = async filter => {
  try {
    const baseUrl = `${process.env.HTTP_SERVER_URL}${process.env.REST_API_ROOT}`;
    // const baseUrl =
    // `${process.env.HTTP_SERVER_URL}${process.env.REST_API_ROOT}/${process.env.REST_API_VERSION}`;
    const { data } = await axios.post(`${baseUrl}/Clients/find`, filter, {
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'aloes-id': process.env.ALOES_ID,
        'aloes-key': process.env.ALOES_KEY,
      },
    });

    return data || null;
  } catch (error) {
    logger.publish(2, 'loopback', 'getStoredClients:err', error);
    return null;
  }
};

/**
 * Authenticate with User method
 *
 * @method module:Server~userAuth
 * @param {string} username - MQTT client username
 * @param {string} password - MQTT client password
 * @returns {Promise<object>}
 */
const userAuth = async (username, password) => {
  let status;
  const details = {};
  try {
    const { userId } = await utils.findById(app.models.accessToken, password);
    if (userId && userId.toString() === username) {
      details.ownerId = username;
      details.user = username;
      details.model = 'User';
      status = 0;
    } else {
      status = 4;
    }
  } catch (e) {
    status = 4;
    // console.error('authenticateInstance:user', e);
  }
  const user = await utils.findById(app.models.user, username);
  if (user && user.id) {
    details.foundUsername = username;
  }
  logger.publish(5, 'loopback', 'userAuth:res', {
    status,
    details,
  });
  return { details, status };
};

/**
 * Authenticate with Device method
 *
 * @method module:Server~deviceAuth
 * @param {string} username - MQTT client username
 * @param {string} password - MQTT client password
 * @returns {Promise<object>}
 */
const deviceAuth = async (username, password) => {
  const details = {};
  let status;
  try {
    const { device, keyType } = await app.models.Device.authenticate(username, password);
    if (device && keyType) {
      details.devEui = device.devEui;
      details.user = username;
      details.model = 'Device';
      status = 0;
    } else {
      status = 4;
    }
  } catch (e) {
    status = 4;
    if (e.statusCode === 403 && e.message === 'UNAUTHORIZED') {
      details.foundUsername = username;
    }
  }
  logger.publish(5, 'loopback', 'deviceAuth:res', {
    status,
    details,
  });
  return { details, status };
};

/**
 * Authenticate with Application method
 *
 * @method module:Server~applicationAuth
 * @param {string} username - MQTT client username
 * @param {string} password - MQTT client password
 * @returns {Promise<object>}
 */
const applicationAuth = async (username, password) => {
  const details = {};
  let status;
  try {
    const { application, keyType } = await app.models.Application.authenticate(username, password);
    if (application && keyType) {
      details.appId = application.id.toString();
      details.user = username;
      details.model = 'Application';
      details.appEui = application.appEui || null;
      status = 0;
    } else {
      status = 4;
    }
  } catch (e) {
    status = 4;
    if (e.statusCode === 403 && e.message === 'UNAUTHORIZED') {
      details.foundUsername = username;
    }
  }
  logger.publish(5, 'loopback', 'applicationAuth:res', {
    status,
    details,
  });
  return { details, status };
};

/**
 * Iterate over each model to try authentication
 * @generator
 * @async
 * @method module:Server~authenticateModels
 * @param {string} username
 * @param {string} password
 * @param {string} [model]
 * @yields {Promise<string>}  Client details and status
 * @returns {Promise<string>}  Client details and status
 */
/* eslint-disable security/detect-object-injection */
async function* authenticateModels(username, password) {
  const authMethods = [userAuth, deviceAuth, applicationAuth];
  let i = 0;
  while (i < authMethods.length) {
    // eslint-disable-next-line no-await-in-loop
    const result = await authMethods[i](username, password);
    i += 1;
    yield result;
  }
}
/* eslint-enable security/detect-object-injection */

const sendAuth = (client, status) => {
  logger.publish(3, 'loopback', 'authenticateInstance:res', { status, client });
  return { client, status };
};

/**
 * Init HTTP server with new Loopback instance
 *
 * Init external services ( MQTT broker )
 * @method module:Server~authenticateInstance
 * @param {object} client - Parsed MQTT client
 * @param {string} username - MQTT client username
 * @param {string} password - MQTT client password
 * @returns {Promise<object>}
 */
const authenticateInstance = async (client, username, password) => {
  logger.publish(4, 'loopback', 'authenticateInstance:req', {
    client,
    username,
  });

  if (!client || !client.id) {
    return sendAuth(null, 1);
  }

  const [savedClient] = await getStoredClients({ match: client.id });
  if (savedClient && savedClient.model) {
    client = { ...savedClient, ...client };
  }

  const { limiter, limiterType, retrySecs } = await rateLimiter.getAuthLimiter(client.ip, username);
  if (retrySecs > 0) {
    if (limiter && limiterType) {
      client.connDetails = {
        retryAfter: String(retrySecs),
        // eslint-disable-next-line security/detect-object-injection
        xRateLimit: rateLimiter.limits[limiterType],
        xRateLimitRemaining: limiter.remainingPoints,
        xRateLimitReset: new Date(Date.now() + limiter.msBeforeNext),
      };
    }
    return sendAuth(client, 4);
  }

  if (
    client.id.startsWith(`aloes-${process.env.ALOES_ID}`) &&
    username === process.env.ALOES_ID &&
    timingSafeEqual(Buffer.from(password), Buffer.from(process.env.ALOES_KEY))
  ) {
    client.user = username;
    client.aloesId = process.env.ALOES_ID;
    client.model = 'Aloes';
    return sendAuth(client, 0);
  }

  try {
    // if client.model use a model arg ?
    let auth = false;
    // eslint-disable-next-line no-restricted-syntax
    for await (const { status, details } of authenticateModels(username, password)) {
      // auth = status;
      if (status === 0) {
        auth = true;
        client = { ...client, ...details };
        break;
      }
    }

    if (auth) {
      await rateLimiter.cleanAuthLimiter(client.ip, client.user);
      // remove client.connDetails rateLimit
      return sendAuth(client, 0);
    }

    let errCode = 4;
    try {
      await rateLimiter.setAuthLimiter(client.ip, client.user);
    } catch (rlRejected) {
      // logger.publish(3, 'loopback', 'authenticateInstance:err', rlRejected);
      if (rlRejected instanceof Error) {
        errCode = 3;
      }
      // else {
      //   status = 4;
      //   client.connDetails = {
      //     retryAfter: String(Math.round(rlRejected.msBeforeNext / 1000)) || 1,
      //     xRateLimit: rlRejected.consumedPoints - 1,
      //     xRateLimitRemaining: rlRejected.remainingPoints,
      //     xRateLimitReset: new Date(Date.now() + rlRejected.msBeforeNext),
      //   };
      // }
    }

    return sendAuth(client, errCode);
  } catch (error) {
    return sendAuth(client, 2);
  }
};

/**
 * Emit publish event
 * @method module:Server.publish
 * @returns {Promise<function>} MQTTClient.publish
 */
app.publish = async (topic, payload, retain = false, qos = 0) =>
  MQTTClient.publish(topic, payload, retain, qos);

/**
 * Event reporting that a/several sensor instance(s) will be deleted.
 * @event publish
 * @param {string} topic - MQTT topic
 * @param {any} payload - MQTT payload
 * @param {boolean} [retain]
 * @param {number} [qos]
 * @returns {Promise<function>} Server.publish
 */
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

    app.post(`${apiPath}/authenticate`, async (req, res) => {
      // console.log('auth/mqtt', req.url, req.body);
      const { client, username, password } = req.body;
      const result = await authenticateInstance(client, username, password);
      res.set('Access-Control-Allow-Origin', '*');
      return res.json(result);
    });

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
 * @returns {Promise<function>} Server.init
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
 * @returns {Promise<function>} Server.stop
 */
app.on('stop', app.stop);

export default app;
