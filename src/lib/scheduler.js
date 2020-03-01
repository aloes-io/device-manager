/* Copyright 2020 Edouard Maleix, read LICENSE */

import logger from '../services/logger';
import utils from '../services/utils';
import DeltaTimer from '../services/delta-timer';

export const collectionName = 'Scheduler';
// store timers in memory when using internal timer
const timers = {};

/**
 * Called when a remote method tries to access Scheduler Model / instance
 * @method module:Scheduler~onBeforeRemote
 * @param {object} app - Loopback App
 * @param {object} ctx - Express context
 * @param {object} ctx.req - Request
 * @param {object} ctx.res - Response
 * @returns {object} context
 */
export const onBeforeRemote = async (app, ctx) => {
  if (ctx.method.name === 'createOrUpdate') {
    const options = ctx.args ? ctx.args.options : {};
    if (!options || !options.currentUser) {
      throw utils.buildError(401, 'UNAUTHORIZED', 'Requires authentification');
    }
    const isAdmin = options.currentUser.roles.includes('admin');
    const ownerId = utils.getOwnerId(options);
    const clientId = ctx.args.client && ctx.args.client.id ? ctx.args.client.id.toString() : null;
    if (!isAdmin && ownerId !== clientId) {
      throw utils.buildError(401, 'UNAUTHORIZED', 'Wrong user');
    }
  } else if (ctx.method.name === 'onTickHook' || ctx.method.name === 'onTimeout') {
    const body = ctx.args.body ? ctx.args.body : null;
    if (!body || typeof body !== 'object') {
      throw utils.buildError(403, 'FAILED REQUEST', 'Missing properties');
    }
    if (!body.secret || body.secret !== process.env.ALOES_KEY) {
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

export const startInternalTimer = async (Scheduler, sensor, client, scheduler) => {
  try {
    let timer = timers[`${sensor.id}`];
    logger.publish(3, `${collectionName}`, 'startInternalTimer:req', scheduler);
    let lastTime;
    if (timer && timer !== null) {
      lastTime = timer.stop();
      delete timers[`${sensor.id}`];
    } else {
      timer = new DeltaTimer(
        Scheduler.onTimeout,
        { sensorId: sensor.id, deviceId: sensor.deviceId },
        scheduler.interval,
      );
      timers[`${sensor.id}`] = timer;
    }
    lastTime = timer.start();
    scheduler = {
      stopTime: Date.now() + scheduler.interval,
      lastTime,
      sensorId: sensor.id,
      deviceId: sensor.deviceId,
      interval: scheduler.interval,
    };
    await Scheduler.set(`sensor-${sensor.id}`, JSON.stringify(scheduler));
    await Scheduler.publish(sensor.deviceId, scheduler, 'POST', client);
    return lastTime;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'startInternalTimer:err', error);
    return null;
  }
};

const startExternalTimer = async (Scheduler, sensor, client, scheduler) => {
  logger.publish(3, `${collectionName}`, 'startExternalTimer:req', scheduler);
  const baseUrl = Scheduler.app.get('url');

  const timer = {
    timeout: scheduler.interval,
    data: {
      sensorId: sensor.id,
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
  try {
    const response = await createTimer(Scheduler.app, timer);
    const lastTime = +new Date();
    if (response && response.location && response.location.split('/')) {
      const timerId = response.location.split('/')[2];
      logger.publish(3, `${collectionName}`, 'startExternalTimer:res', timerId);
      scheduler = {
        stopTime: Date.now() + scheduler.interval,
        lastTime,
        timerId,
        sensorId: sensor.id,
        deviceId: sensor.deviceId,
        interval: scheduler.interval,
      };
      await Scheduler.set(`sensor-${sensor.id}`, JSON.stringify(scheduler));
      await Scheduler.publish(sensor.deviceId, scheduler, 'POST', client);
    }
    return lastTime;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'startExternalTimer:err', error);
    return null;
  }
};

export const startTimer = async (Scheduler, sensor, resources, client, mode = 0) => {
  let scheduler = JSON.parse(await Scheduler.get(`sensor-${sensor.id}`));
  if (!scheduler || scheduler === null) {
    scheduler = {};
  }
  logger.publish(4, `${collectionName}`, 'startTimer:req', mode);

  // todo improve timeLeft setting
  scheduler.interval = resources['5521'] * 1000;
  if (resources['5526'] === 0) {
    scheduler.interval = 200;
  } else if (mode === 1) {
    scheduler.interval = resources['5538'] * 1000;
  }
  if (process.env.EXTERNAL_TIMER && process.env.TIMER_SERVER_URL) {
    await startExternalTimer(Scheduler, sensor, client, scheduler);
  } else {
    await startInternalTimer(Scheduler, sensor, client, scheduler);
  }

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

const stopExternalTimer = async (Scheduler, sensor, client, scheduler) => {
  try {
    if (!scheduler || !scheduler.timerId) throw new Error('Missing timer');
    logger.publish(4, `${collectionName}`, 'stopExternalTimer:req', scheduler);
    await deleteTimer(Scheduler.app, scheduler.timerId);
    await Scheduler.delete(`sensor-${sensor.id}`);
    await Scheduler.publish(sensor.deviceId, scheduler, 'DELETE', client);
    return scheduler.lastTime;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'stopExternalTimer:err', error);
    return null;
  }
};

const stopInternalTimer = async (Scheduler, sensor, client, scheduler) => {
  try {
    const timer = timers[`${sensor.id}`];
    if (!timer && !scheduler) throw new Error('Missing timer');
    logger.publish(4, `${collectionName}`, 'stopInternalTimer:req', scheduler);
    let lastTime;
    if (timer) {
      lastTime = timer.stop();
      delete timers[`${sensor.id}`];
    }
    if (scheduler) {
      lastTime = scheduler.lastTime;
      await Scheduler.delete(`sensor-${sensor.id}`);
      await Scheduler.publish(sensor.deviceId, scheduler, 'DELETE', client);
      // if sensor.resources['5525'] > 0 setTimeout to update 5543
    }
    return lastTime;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'stopInternalTimer:err', error);
    return null;
  }
};

const stopTimer = async (Scheduler, sensor, resources, client, mode = 0) => {
  logger.publish(4, `${collectionName}`, 'stopTimer:req', { sensorId: sensor.id, mode });
  const scheduler = JSON.parse(await Scheduler.get(`sensor-${sensor.id}`));
  if (process.env.EXTERNAL_TIMER && process.env.TIMER_SERVER_URL) {
    await stopExternalTimer(Scheduler, sensor, client, scheduler);
  } else {
    await stopInternalTimer(Scheduler, sensor, client, scheduler);
  }

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

export const onTimeout = async (Scheduler, sensorId) => {
  const Sensor = Scheduler.app.models.Sensor;
  const SensorResource = Scheduler.app.models.SensorResource;

  const sensor = await Sensor.findById(sensorId);
  const resources = await SensorResource.find(sensor.deviceId, sensor.id);
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
      throw new Error('Wrong timer type');
  }
  await Sensor.createOrUpdate(sensor, 5543, 1);
};

export const syncRunningTimers = async (Scheduler, delay) => {
  const schedulers = await Scheduler.getAll({ match: 'sensor-*' });
  const Sensor = Scheduler.app.models.Sensor;
  const SensorResource = Scheduler.app.models.SensorResource;
  const promises = schedulers.map(async scheduler => {
    try {
      let timeLeft = Math.round((scheduler.stopTime - Date.now()) / 1000);
      const sensor = await Sensor.findById(scheduler.sensorId);
      const resources = await SensorResource.find(sensor.deviceId, sensor.id);
      resources['5544'] += Math.round(delay / 1000);
      resources['5543'] = 0;
      resources['5850'] = 1;
      resources['5523'] = 'started';
      const clients = await Scheduler.app.models.Client.getAll({ match: `${sensor.ownerId}*` });
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
  await Promise.all(promises);
};
