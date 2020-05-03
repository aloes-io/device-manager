/* Copyright 2020 Edouard Maleix, read LICENSE */

import logger from '../../services/logger';
import utils from '../utils';

export const collectionName = 'Scheduler';

export const clockInterval = 5000;

/**
 * Called when a remote method tries to access Scheduler Model / instance
 * @method module:Scheduler~onBeforeRemote
 * @param {object} ctx - Express context
 * @returns {Promise<object>} context
 */
export const onBeforeRemote = async ctx => {
  if (ctx.method.name === 'createOrUpdate') {
    const options = ctx.options || {};
    const isAdmin = options.currentUser.roles.includes('admin');
    const ownerId = utils.getOwnerId(options);
    const clientId = ctx.args.client && ctx.args.client.id ? ctx.args.client.id.toString() : null;
    if (!isAdmin && ownerId !== clientId) {
      throw utils.buildError(401, 'UNAUTHORIZED', 'Wrong user');
    }
  } else if (ctx.method.name === 'onTickHook' || ctx.method.name === 'onTimeout') {
    const body = ctx.args.body ? ctx.args.body : null;
    if (!body || !body.secret || body.secret !== process.env.ALOES_KEY) {
      throw utils.buildError(401, 'UNAUTHORIZED', 'Requires authentification');
    }
  }
  return ctx;
};

export const createTimer = async (app, timer) =>
  new Promise((resolve, reject) => {
    app.datasources.timer.create(timer, (err, body, res) =>
      err ? reject(err) : resolve(res.headers),
    );
  });

// const updateTimer = async (app, timerId, timer) =>
//   new Promise((resolve, reject) => {
//     app.datasources.timer.updateById(timerId, timer, (err, body, res) =>
//       err ? reject(err) : resolve(res.headers),
//     );
//   });

export const deleteTimer = async (app, timerId) =>
  new Promise((resolve, reject) => {
    app.datasources.timer.deleteById(timerId, (err, body, res) =>
      err ? reject(err) : resolve(res.headers),
    );
  });

/**
 * Create a new Skyring timer and update Scheduler instance
 * @async
 * @method module:Scheduler~resetClock
 * @param {object} app - Loopback application
 * @param {object} [scheduler] - Scheduler instance
 * @param {number} timeout - delay
 * @param {object} data - data contained when timeout wille be executed
 * @returns {Promise<object>} scheduler
 */
export const resetClock = async (app, scheduler = {}, timeout, data) => {
  const baseUrl = app.get('url') || process.env.HTTP_SERVER_URL;

  const timer = {
    timeout,
    data,
    callback: {
      transport: 'http',
      method: 'post',
      uri: `${baseUrl}${process.env.REST_API_ROOT}/${collectionName}s/on-tick`,
      // uri: `${baseUrl}${process.env.REST_API_ROOT}/${process.env.REST_API_VERSION}/${collectionName}s/on-tick`;
    },
  };

  const response = await createTimer(app, timer);
  if (!response || !response.location) {
    throw utils.buildError(400, 'INVALID_TIMER_RESPONSE', 'Invalid Timer service response');
  }
  const timerId = response.location.split('/')[2];
  logger.publish(3, `${collectionName}`, 'resetClock:res', timerId);
  scheduler.stopTime = Date.now() + clockInterval;
  scheduler.lastTime = +new Date();
  scheduler.timerId = timerId;
  scheduler.interval = clockInterval;
  scheduler.isUpdating = false;

  return scheduler;
};

const startExternalTimer = async (Model, sensor, client, scheduler) => {
  logger.publish(3, `${collectionName}`, 'startExternalTimer:req', scheduler);
  const baseUrl = Model.app.get('url');
  const timer = {
    timeout: +scheduler.interval,
    data: {
      sensorId: sensor.id.toString(),
      deviceId: sensor.deviceId.toString(),
      secret: process.env.ALOES_KEY,
    },
    callback: {
      transport: 'http',
      method: 'post',
      uri: `${baseUrl}${process.env.REST_API_ROOT}/${collectionName}s/on-timeout`,
      // uri: `${baseUrl}${process.env.REST_API_ROOT}/${process.env.REST_API_VERSION}/${collectionName}s/on-timeout`;
    },
  };

  const response = await createTimer(Model.app, timer);
  if (!response || !response.location) {
    throw utils.buildError(400, 'INVALID_TIMER_RESPONSE', 'Invalid Timer service response');
  }
  scheduler = {
    stopTime: Date.now() + scheduler.interval,
    lastTime: +new Date(),
    timerId: response.location.split('/')[2],
    sensorId: sensor.id,
    deviceId: sensor.deviceId,
    interval: scheduler.interval,
  };
  logger.publish(3, `${collectionName}`, 'startExternalTimer:res', scheduler);

  await Model.set(`sensor-${sensor.id}`, JSON.stringify(scheduler));
  await Model.publish(sensor.deviceId, scheduler, 'POST', client);

  return scheduler;
};

/**
 * Start a timer instance based on sensor resources ( startInternalTimer | startExternalTimer )
 *
 * Update Sensor resources
 *
 * @method module:Scheduler~startTimer
 * @param {object} Scheduler - Scheduler Model
 * @param {object} sensor - Sensor instance
 * @param {object} resources -  Sensor instance resources
 * @param {object} client - MQTT client
 * @param {number} mode - Timer mode
 * @returns {Promise<object>} scheduler
 */
export const startTimer = async (Scheduler, sensor, resources, client, mode = 0) => {
  let scheduler = JSON.parse(await Scheduler.get(`sensor-${sensor.id}`)) || {};
  logger.publish(4, `${collectionName}`, 'startTimer:req', mode);

  // todo improve timeLeft setting
  scheduler.interval = resources['5521'] * 1000;
  if (resources['5526'] === 0) {
    scheduler.interval = 200;
  } else if (mode === 1) {
    scheduler.interval = resources['5538'] * 1000;
  }

  scheduler = await startExternalTimer(Scheduler, sensor, client, scheduler);

  if (mode === 1) {
    if (!resources['5538']) {
      resources['5538'] = resources['5521'];
    }
    resources['5523'] = 'restarted';
    // console.log('Restart lastTime', lastTime, 'interval :', sensor.resources['5538']);
  } else {
    resources['5538'] = resources['5521'];
    resources['5544'] = 0;
    resources['5523'] = 'started';
    // console.log('Start lastTime', lastTime, 'interval :', sensor.resources['5521']);
  }
  resources['5543'] = 0;
  resources['5850'] = 1;
  await Scheduler.app.models.SensorResource.save(sensor.deviceId, sensor.id, resources);
  return scheduler;
};

const stopExternalTimer = async (Model, sensor, client, scheduler) => {
  if (!scheduler || !scheduler.timerId) {
    throw new Error('Missing timer');
  }
  logger.publish(4, `${collectionName}`, 'stopExternalTimer:req', scheduler);
  await deleteTimer(Model.app, scheduler.timerId);
  await Model.delete(`sensor-${sensor.id}`);
  await Model.publish(sensor.deviceId, scheduler, 'DELETE', client);
  return scheduler;
};

/**
 * Stop a timer instance based on sensor resources ( stopInternalTimer | stopExternalTimer )
 *
 * Update Sensor resources
 *
 * @method module:Scheduler~stopTimer
 * @param {object} Scheduler - Scheduler Model
 * @param {object} sensor - Sensor instance
 * @param {object} resources -  Sensor instance resources
 * @param {object} client - MQTT client
 * @param {number} mode - Timer mode
 * @returns {Promise<object>} scheduler
 */
const stopTimer = async (Scheduler, sensor, resources, client, mode = 0) => {
  logger.publish(4, `${collectionName}`, 'stopTimer:req', { sensorId: sensor.id, mode });
  let scheduler = JSON.parse(await Scheduler.get(`sensor-${sensor.id}`));
  // if (!scheduler || !scheduler.timerId) throw new Error('Missing timer');

  scheduler = await stopExternalTimer(Scheduler, sensor, client, scheduler);

  if (mode === 1) {
    const stopTime = scheduler ? scheduler.stopTime : Date.now() + resources['5521'] * 1000;

    // console.log('Pause stopTime :', stopTime);
    const timeLeft = Math.round((stopTime - Date.now()) / 1000);
    if (typeof timeLeft === 'number' && !isNaN(timeLeft)) {
      resources['5538'] = timeLeft;
    }
    resources['5523'] = 'paused';
  } else {
    resources['5538'] = 0;
    resources['5523'] = 'stopped';
  }
  resources['5543'] = 0;
  resources['5850'] = 0;
  await Scheduler.app.models.SensorResource.save(sensor.deviceId, sensor.id, resources);
  return scheduler;
};

/**
 * Parse a timer event and dispatch to the proper function
 *
 * ( startTimer | stopTimer )
 *
 * @method module:Scheduler~parseTimerEvent
 * @param {object} Scheduler - Scheduler Model
 * @param {object} sensor - Sensor instance
 * @param {object} client - MQTT client
 * @returns {Promise<object>} scheduler
 */
export const parseTimerEvent = async (Scheduler, sensor, client) => {
  let scheduler;
  logger.publish(4, `${collectionName}`, 'parseTimerEvent:req', sensor.resources['5523']);
  switch (sensor.resources['5523']) {
    case 'start':
      scheduler = await startTimer(Scheduler, sensor, sensor.resources, client);
      break;
    case 'stop':
      scheduler = await stopTimer(Scheduler, sensor, sensor.resources, client);
      break;
    case 'pause':
      scheduler = await stopTimer(Scheduler, sensor, sensor.resources, client, 1);
      break;
    case 'restart':
      scheduler = await startTimer(Scheduler, sensor, sensor.resources, client, 1);
      break;
    default:
      logger.publish(3, `${collectionName}`, 'parseTimerEvent:notFound', sensor.resources['5523']);
  }
  logger.publish(4, `${collectionName}`, 'parseTimerEvent:res', {
    scheduler: scheduler || null,
  });

  return scheduler;
};

/**
 * Parse a timer state and dispatch to the proper function
 *
 * ( startTimer | stopTimer )
 *
 * @method module:Scheduler~parseTimerEvent
 * @param {object} Scheduler - Scheduler Model
 * @param {object} sensor - Sensor instance
 * @param {object} client - MQTT client
 * @returns {Promise<object>} scheduler
 */
export const parseTimerState = async (Scheduler, sensor, client) => {
  let scheduler;
  logger.publish(4, `${collectionName}`, 'parseTimerState:req', sensor.resources['5850']);
  switch (sensor.resources['5850']) {
    case 0:
      scheduler = await stopTimer(Scheduler, sensor, sensor.resources, client);
      break;
    case 1:
      scheduler = await startTimer(Scheduler, sensor, sensor.resources, client);
      break;
    default:
      logger.publish(3, `${collectionName}`, 'parseTimerState:notFound', sensor.resources['5850']);
  }

  return scheduler;
};

/**
 * Method called by a timer instance at timeout
 *
 * ( startTimer | stopTimer )
 *
 * @method module:Scheduler~onTimeout
 * @param {object} Scheduler - Scheduler Model
 * @param {object} sensorId - Sensor instance id
 * @returns {Promise<boolean>} status
 */
export const onTimeout = async (Scheduler, sensorId) => {
  const Sensor = Scheduler.app.models.Sensor;
  const SensorResource = Scheduler.app.models.SensorResource;

  const sensor = await utils.findById(Sensor, sensorId);
  if (!sensor) return false;
  const resources = await SensorResource.find(sensor.deviceId, sensor.id);
  if (!resources) return false;
  const mode = resources['5526'];
  logger.publish(4, `${collectionName}`, 'onTimeout:mode', resources['5526']);

  switch (mode) {
    case 0:
      // immediate
      resources['5523'] = 'stopped';
      resources['5850'] = 0;
      resources['5538'] = 0;
      resources['5543'] = 1;
      resources['5534'] += 1;
      await stopTimer(Scheduler, sensor, resources, null, 0);
      break;
    case 1:
      // timeout
      resources['5523'] = 'stopped';
      resources['5850'] = 0;
      resources['5538'] = 0;
      resources['5543'] = 1;
      resources['5534'] += 1;
      await stopTimer(Scheduler, sensor, resources, null, 0);
      break;
    case 2:
      // interval
      resources['5538'] = sensor.resources['5521'];
      resources['5523'] = 'ticked';
      resources['5543'] = 1;
      resources['5850'] = 1;
      resources['5534'] += 1;
      await SensorResource.save(sensor.deviceId, sensor.id, resources);
      break;
    default:
      throw new Error('Wrong timer mode');
  }
  await Sensor.createOrUpdate(sensor, 5543, 1);
  return true;
};

/**
 * Method called by a timer instance at timeout
 *
 * Update active Scheduler and related Sensor instances
 *
 * @async
 * @method module:Scheduler~syncRunningTimers
 * @param {object} Scheduler - Scheduler Model
 * @param {object} delay
 * @returns {object[]} sensors
 */
export const syncRunningTimers = async (Scheduler, delay) => {
  const schedulers = await Scheduler.getAll({ match: 'sensor-*' });
  logger.publish(3, `${collectionName}`, 'syncRunningTimers:req', {
    schedulersCount: schedulers && schedulers.length,
  });
  const Sensor = Scheduler.app.models.Sensor;
  const SensorResource = Scheduler.app.models.SensorResource;
  const promises = schedulers.map(async scheduler => {
    try {
      let timeLeft = Math.round((scheduler.stopTime - Date.now()) / 1000);
      const sensor = await utils.findById(Sensor, scheduler.sensorId);
      const resources = await SensorResource.find(sensor.deviceId, sensor.id);
      resources['5544'] += Math.round(delay / 1000);
      resources['5543'] = 0;
      resources['5850'] = 1;
      resources['5523'] = 'started';
      const clients = await Scheduler.app.models.Client.find({ match: `${sensor.ownerId}*` });
      const client = clients.length ? clients[0] : null;
      if (timeLeft <= 0) {
        // in case timeout callback/webhook was not triggered
        timeLeft = 0;
        await stopTimer(Scheduler, sensor, resources, client);
      } else {
        await SensorResource.save(sensor.deviceId, sensor.id, resources);
      }
      logger.publish(3, `${collectionName}`, 'syncRunningTimers:res', { timeLeft, client });
      return Sensor.createOrUpdate(sensor, 5538, timeLeft, client);
    } catch (error) {
      return null;
    }
  });
  return Promise.all(promises);
};
