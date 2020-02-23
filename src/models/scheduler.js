/* Copyright 2019 Edouard Maleix, read LICENSE */

/* eslint-disable no-restricted-syntax */
import { publish } from 'iot-agent';
// import debounce from 'lodash.debounce';
import { publishToDeviceApplications } from '../lib/device';
import logger from '../services/logger';
import DeltaTimer from '../services/delta-timer';
import utils from '../services/utils';

const collectionName = 'Scheduler';
const clockInterval = 5000;
const schedulerClockId = `scheduler-clock`;
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
const onBeforeRemote = async (app, ctx) => {
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

/**
 * @module Scheduler
 * @property {String} id Scheduler ID
 * @property {String} [name] Scheduler name
 * @property {String} [model] Aloes model ( Application, Device, ... )
 */
module.exports = function(Scheduler) {
  /**
   * Format packet and send it via MQTT broker
   * @method module:Scheduler.publish
   * @param {object} device - found Device instance
   * @param {object} measurement - Scheduler instance
   * @param {string} [method] - MQTT method
   * @param {object} [client] - MQTT client target
   * @fires Server.publish
   */
  Scheduler.publish = async (deviceId, scheduler, method) => {
    try {
      if (!deviceId) {
        throw utils.buildError(403, 'MISSING_DEVICE_ID', 'No device in arguments');
      }
      const device = await Scheduler.app.models.Device.findById(deviceId);
      if (!device) {
        throw utils.buildError(403, 'MISSING_DEVICE', 'No device found');
      }
      const packet = await publish({
        userId: device.ownerId,
        collection: collectionName,
        //  modelId: scheduler.id,
        data: scheduler,
        method: method || 'POST',
        pattern: 'aloesclient',
      });

      // console.log('PUBLISH SCHEDULER PACKET ', packet.payload);
      if (packet && packet.topic && packet.payload) {
        logger.publish(4, `${collectionName}`, 'publish:res', {
          topic: packet.topic,
        });

        publishToDeviceApplications(Scheduler.app, device, packet);
        Scheduler.app.emit('publish', packet.topic, packet.payload, false, 0);
        return scheduler;
      }
      throw new Error('Invalid MQTT Packet encoding');
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'publish:err', error);
      throw error;
    }
  };

  const createTimer = async timer =>
    new Promise((resolve, reject) => {
      Scheduler.app.datasources.timer.create(timer, (err, body, res) =>
        err ? reject(err) : resolve(res.headers),
      );
    });

  // const updateTimer = async (timerId, timer) =>
  //   new Promise((resolve, reject) => {
  //     Scheduler.app.datasources.timer.updateById(timerId, timer, (err, body, res) =>
  //       err ? reject(err) : resolve(res.headers),
  //     );
  //   });

  const deleteTimer = async timerId =>
    new Promise((resolve, reject) => {
      Scheduler.app.datasources.timer.deleteById(timerId, (err, body, res) =>
        err ? reject(err) : resolve(res.headers),
      );
    });

  const stopExternalTimer = async (sensor, client, scheduler) => {
    try {
      if (!scheduler || !scheduler.timerId) throw new Error('Missing timer');
      logger.publish(4, `${collectionName}`, 'stopExternalTimer:req', scheduler);
      await Scheduler.delete(`sensor-${sensor.id}`);
      await deleteTimer(scheduler.timerId);
      await Scheduler.publish(sensor.deviceId, scheduler, 'DELETE', client);
      return scheduler.lastTime;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'stopExternalTimer:err', error);
      return null;
    }
  };

  const stopInternalTimer = async (sensor, client, scheduler) => {
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

  const stopTimer = async (sensor, client, mode = 0) => {
    logger.publish(4, `${collectionName}`, 'stopTimer:req', { sensorId: sensor.id, mode });
    const scheduler = JSON.parse(await Scheduler.get(`sensor-${sensor.id}`));
    if (process.env.EXTERNAL_TIMER && process.env.TIMER_SERVER_URL) {
      await stopExternalTimer(sensor, client, scheduler);
    } else {
      await stopInternalTimer(sensor, client, scheduler);
    }

    if (mode === 1) {
      const stopTime = scheduler
        ? scheduler.stopTime
        : Date.now() + sensor.resources['5521'] * 1000;

      // console.log('Pause stopTime :', stopTime);
      const timeLeft = Math.round((stopTime - Date.now()) / 1000);
      if (typeof timeLeft === 'number' && !isNaN(timeLeft)) {
        sensor.resources['5538'] = timeLeft;
      }
      sensor.resources['5523'] = 'paused';
    } else {
      sensor.resources['5538'] = 0;
      sensor.resources['5523'] = 'stopped';
    }
    sensor.resources['5543'] = 0;
    sensor.resources['5850'] = 0;
    return { sensor, scheduler };
  };

  const startExternalTimer = async (sensor, client, scheduler) => {
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
      const response = await createTimer(timer);
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

  const startInternalTimer = async (sensor, client, scheduler) => {
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

  const startTimer = async (sensor, client, mode = 0) => {
    let scheduler = JSON.parse(await Scheduler.get(`sensor-${sensor.id}`));
    if (!scheduler || scheduler === null) {
      scheduler = {};
    }
    logger.publish(4, `${collectionName}`, 'startTimer:req', mode);

    // todo improve timeLeft setting
    scheduler.interval = sensor.resources['5521'] * 1000;
    if (sensor.resources['5526'] === 0) {
      scheduler.interval = 200;
    } else if (mode === 1) {
      scheduler.interval = sensor.resources['5538'] * 1000;
    }
    if (process.env.EXTERNAL_TIMER && process.env.TIMER_SERVER_URL) {
      await startExternalTimer(sensor, client, scheduler);
    } else {
      await startInternalTimer(sensor, client, scheduler);
    }

    if (mode === 1) {
      if (!sensor.resources['5538']) {
        sensor.resources['5538'] = sensor.resources['5521'];
      }
      sensor.resources['5523'] = 'restarted';
      // console.log('Restart lastTime', lastTime, 'interval :', sensor.resources['5538']);
    } else {
      sensor.resources['5538'] = sensor.resources['5521'];
      sensor.resources['5544'] = 0;
      sensor.resources['5523'] = 'started';
      // console.log('Start lastTime', lastTime, 'interval :', sensor.resources['5521']);
    }
    sensor.resources['5543'] = 0;
    sensor.resources['5850'] = 1;
    return { sensor, scheduler };
  };

  /**
   * Scheduler timeout callback / webhook ( sensor timer )
   * @method module:Scheduler.onTimeout
   * @param {object} body - Timer callback body
   * @returns {object} payload - Updated scheduler and sensor
   */
  Scheduler.onTimeout = async body => {
    const { sensorId } = body;
    if (!sensorId || sensorId === null) throw new Error('Missing sensor Id');

    logger.publish(4, `${collectionName}`, 'onTimeout:req', body);
    const sensor = await Scheduler.app.models.Sensor.findById(sensorId);
    const mode = sensor.resources['5526'];
    logger.publish(4, `${collectionName}`, 'onTimeout:mode', sensor.resources['5526']);

    switch (mode) {
      case 0:
        // immediate
        sensor.resources['5523'] = 'stopped';
        sensor.resources['5850'] = 0;
        sensor.resources['5538'] = 0;
        sensor.resources['5543'] = 1;
        await stopTimer(sensor, null, 0);
        break;
      case 1:
        // timeout
        sensor.resources['5523'] = 'stopped';
        sensor.resources['5850'] = 0;
        sensor.resources['5538'] = 0;
        sensor.resources['5543'] = 1;
        await stopTimer(sensor, null, 0);
        break;
      case 2:
        // interval
        sensor.resources['5538'] = sensor.resources['5521'];
        sensor.resources['5523'] = 'ticked';
        sensor.resources['5543'] = 1;
        sensor.resources['5850'] = 1;
        break;
      default:
        throw new Error('Wrong timer type');
    }
    sensor.resources['5534'] += 1;
    await Scheduler.app.models.Sensor.createOrUpdate(sensor, 5543, 1);
    return true;
  };

  const parseTimerEvent = async (sensor, client) => {
    let result;
    logger.publish(4, `${collectionName}`, 'parseTimerEvent:req', sensor.resources['5523']);
    switch (sensor.resources['5523']) {
      case 'start':
        result = await startTimer(sensor, client);
        break;
      case 'stop':
        result = await stopTimer(sensor, client);
        break;
      case 'pause':
        result = await stopTimer(sensor, client, 1);
        break;
      case 'restart':
        result = await startTimer(sensor, client, 1);
        break;
      default:
        logger.publish(
          3,
          `${collectionName}`,
          'parseTimerEvent:notFound',
          sensor.resources['5523'],
        );
    }
    logger.publish(4, `${collectionName}`, 'parseTimerEvent:res', {
      scheduler: result.scheduler || null,
    });

    return result;
  };

  const parseTimerState = async (sensor, client) => {
    let result;
    logger.publish(4, `${collectionName}`, 'parseTimerState:req', sensor.resources['5850']);
    switch (sensor.resources['5850']) {
      case 0:
        result = await stopTimer(sensor, client);
        break;
      case 1:
        result = await startTimer(sensor, client);
        break;
      default:
        logger.publish(
          3,
          `${collectionName}`,
          'parseTimerState:notFound',
          sensor.resources['5850'],
        );
    }

    return result;
  };

  /**
   * Create or update scheduler stored in cache
   * @method module:Scheduler.createOrUpdate
   * @param {object} device - found Device instance
   * @param {object} sensor - found Sensor instance
   * @param {object} [client] - MQTT client
   * @returns {object} scheduler - Updated scheduler
   */
  Scheduler.createOrUpdate = async (sensor, client) => {
    let result = {};
    switch (sensor.resource) {
      case 5521:
        // duration of the time delay
        break;
      case 5523:
        // Trigger initing actuation
        result = await parseTimerEvent(sensor, client);
        break;
      case 5525:
        // minimum off time
        break;
      case 5526:
        // timermode
        break;
      case 5534:
        // scheduler output transitions counter
        break;
      case 5538:
        // remaining time
        // let timer = timers[`${sensor.id}`];
        // if (timer && timer !== null) {
        //   console.log('Found internal timer instance', timer);
        // }
        // or
        // await updateTimer(scheduler.timerId, timer);
        break;
      case 5543:
        // timer output state
        break;
      case 5544:
        // ON time duration counter
        break;
      case 5850:
        // trigger initing actuation
        result = await parseTimerState(sensor, client);
        break;
      default:
        throw new Error('wrong resource');
    }
    if (!result || !result.sensor) {
      throw new Error('Event parsed with error');
    }
    return result;
  };

  /**
   * Iterate over each Scheduler keys found in cache
   * @method module:Scheduler.cacheIterator
   * @param {object} [filter] - Scheduler filter
   * @returns {string} key - Cached key
   */
  Scheduler.cacheIterator = async function*(filter) {
    const iterator = Scheduler.iterateKeys(filter);
    let empty = false;
    while (!empty) {
      // eslint-disable-next-line no-await-in-loop
      const key = await iterator.next();
      if (!key) {
        empty = true;
        return;
      }
      yield key;
    }
  };

  /**
   * Find schedulers in the cache and add to device instance
   * @method module:Scheduler.getAll
   * @param {object} [filter] - Scheduler filter
   * @returns {array} schedulers - Cached schedulers
   */
  Scheduler.getAll = async filter => {
    logger.publish(4, `${collectionName}`, 'getAll:req', { filter });
    const schedulers = [];
    for await (const key of Scheduler.cacheIterator(filter)) {
      try {
        const scheduler = JSON.parse(await Scheduler.get(key));
        schedulers.push(scheduler);
      } catch (e) {
        // empty
      }
    }
    return schedulers;
  };

  /**
   * Delete schedulers stored in cache
   * @method module:Scheduler.deleteAll
   * @param {object} [filter] - Scheduler filter
   * @returns {array} schedulers - Cached schedulers keys
   */
  Scheduler.deleteAll = async filter => {
    const schedulers = [];
    logger.publish(4, `${collectionName}`, 'deleteAll:req', { filter });
    for await (const key of Scheduler.cacheIterator(filter)) {
      try {
        await Scheduler.delete(key);
        schedulers.push(key);
      } catch (e) {
        // empty
      }
    }
    return schedulers;
  };

  /**
   * Scheduler tick event ( scheduler clock )
   *
   * Update every sensor having an active scheduler
   *
   * @method module:Scheduler.onTick
   * @param {object} data - Timer event data
   * @fires Scheduler.publish
   */
  Scheduler.onTick = async data => {
    try {
      const { delay, time, lastTime } = data;
      if (!time || !lastTime) throw new Error('Missing event properties');
      const topic = `aloes-${process.env.ALOES_ID}/${collectionName}/HEAD`;
      const payload = { date: new Date(time), time, lastTime };
      const schedulers = await Scheduler.getAll({ match: 'sensor-*' });
      logger.publish(4, `${collectionName}`, 'onTick:req', { schedulersCount: schedulers.length });
      Scheduler.app.emit('publish', topic, payload, false, 0);

      const promises = schedulers.map(async scheduler => {
        try {
          let timeLeft = Math.round((scheduler.stopTime - Date.now()) / 1000);
          const sensor = await Scheduler.app.models.Sensor.findById(scheduler.sensorId);
          sensor.resources['5544'] += Math.round(delay / 1000);
          sensor.resources['5543'] = 0;
          sensor.resources['5850'] = 1;
          sensor.resources['5523'] = 'started';
          const clients = await Scheduler.app.models.Client.getAll({ match: `${sensor.ownerId}*` });
          const client = clients.length ? clients[0] : null;
          if (timeLeft <= 0) {
            // in case timeout callback/webhook was not triggered
            timeLeft = 0;
            await stopTimer(sensor, client);
          }
          logger.publish(3, `${collectionName}`, 'onTick:res', { timeLeft, client });
          return Scheduler.app.models.Sensor.createOrUpdate(sensor, 5538, timeLeft, client);
        } catch (error) {
          return null;
        }
      });
      await Promise.all(promises);
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'onTick:err', error);
    }
  };

  /**
   * Scheduler timeout callback ( scheduler clock )
   *
   * validate webhook content before dispatch
   *
   * @method module:Scheduler~onTickHook
   * @param {object} body - Timer callback data
   * @fires Scheduler.tick
   * @returns {boolean}
   */
  const onTickHook = async body => {
    try {
      let scheduler;
      try {
        scheduler = JSON.parse(await Scheduler.get(body.name));
      } catch (e) {
        scheduler = {};
      }

      logger.publish(3, `${collectionName}`, 'onTickHook:req', scheduler);
      if (scheduler && scheduler.timerId) {
        if (scheduler.isUpdating) {
          return false;
        }
        // logger.publish(4, `${collectionName}`, 'onTick:res', payload);
        // const deltaTime = thisTime - scheduler.lastTime;
        // const interval = Math.max(clockInterval - deltaTime, 0);
        if (Date.now() - scheduler.stopTime <= 0) {
          return false;
        }
        // await Scheduler.set(schedulerClockId, JSON.stringify({ ...scheduler, isUpdating: true }));
      }

      const thisTime = +new Date();
      const payload = {
        date: new Date(thisTime),
        time: thisTime,
        lastTime: scheduler && scheduler.lastTime ? scheduler.lastTime : +new Date(),
      };
      Scheduler.emit('ticked', payload);

      const baseUrl = Scheduler.app.get('url')
        ? Scheduler.app.get('url')
        : process.env.HTTP_SERVER_URL;

      const timer = {
        timeout: clockInterval,
        data: body,
        callback: {
          transport: 'http',
          method: 'post',
          uri: `${baseUrl}${process.env.REST_API_ROOT}/${collectionName}s/on-tick`,
          // uri: `${baseUrl}${process.env.REST_API_ROOT}/${process.env.REST_API_VERSION}/${collectionName}s/on-tick`;
        },
      };

      const response = await createTimer(timer);
      if (response && response.location) {
        const timerId = response.location.split('/')[2];
        logger.publish(3, `${collectionName}`, 'onTickHook:res', timerId);
        scheduler.stopTime = Date.now() + clockInterval;
        scheduler.lastTime = +new Date();
        scheduler.timerId = timerId;
        scheduler.interval = clockInterval;
        scheduler.isUpdating = false;
        await Scheduler.set(schedulerClockId, JSON.stringify(scheduler));
        return true;
      }
      return false;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'onTickHook:err', error);
      // throw error;
      return false;
    }
  };

  /**
   * Endpoint for Scheduler external timeout hooks
   * @method module:Scheduler.onTickHook
   * @param {object} body - Timer callback data
   * @returns {function} Scheduler~onTickHook
   */
  // debounce(onTickHook, 150);
  Scheduler.onTickHook = onTickHook;

  Scheduler.setExternalClock = async interval => {
    let scheduler = JSON.parse(await Scheduler.get(schedulerClockId)) || {};
    logger.publish(3, `${collectionName}`, 'setExternalClock:req', interval);
    if (scheduler && scheduler.timerId) {
      const diff = Date.now() - scheduler.stopTime;
      logger.publish(3, `${collectionName}`, 'setExternalClock:diff', {
        stopTime: scheduler.stopTime,
        diff,
      });
      if (diff < 0) {
        return scheduler;
      }
    }
    // if (!scheduler || scheduler === null) {
    //   scheduler = {};
    // }

    const baseUrl = Scheduler.app.get('url');
    const timer = {
      timeout: interval,
      data: { name: schedulerClockId, secret: process.env.ALOES_KEY },
      callback: {
        transport: 'http',
        method: 'post',
        uri: `${baseUrl}${process.env.REST_API_ROOT}/${collectionName}s/on-tick`,
        // uri: `${baseUrl}${process.env.REST_API_ROOT}/${process.env.REST_API_VERSION}/${collectionName}s/on-timeout`;
      },
    };
    // logger.publish(4, `${collectionName}`, 'setExternalClock:callback', timer.callback.uri);

    const response = await createTimer(timer);
    if (response && response.location && response.location.split('/')) {
      const timerId = response.location.split('/')[2];
      scheduler = {
        stopTime: Date.now() + interval,
        lastTime: +new Date(),
        timerId,
        interval,
      };
      await Scheduler.set(schedulerClockId, JSON.stringify(scheduler));
      logger.publish(3, `${collectionName}`, 'setExternalClock:res', { scheduler });
    }
    return scheduler;
  };

  const checkExternalClock = async () => {
    logger.publish(3, `${collectionName}`, 'checkExternalClock:req', '');
    await Scheduler.setExternalClock(clockInterval);
    // return Scheduler.setInternalClock(checkExternalClock, clockInterval * 2);
  };

  Scheduler.setInternalClock = (callback, interval) => {
    logger.publish(4, `${collectionName}`, 'setInternalClock:req', interval);
    if (Scheduler.timer && Scheduler.timer !== null) {
      Scheduler.timer.stop();
    }
    Scheduler.timer = new DeltaTimer(callback, {}, interval);
    Scheduler.start = Scheduler.timer.start();
    logger.publish(3, `${collectionName}`, 'setInternalClock:res', Scheduler.start);
    return Scheduler.timer;
  };

  /**
   * Init clock to synchronize with every active schedulers
   *
   * if EXTERNAL_TIMER is enabled, Scheduler will use Skyring external timer handler
   *
   * else a DeltaTimer instance will be created and stored in memory
   * @method module:Scheduler.setClock
   * @param {number} interval - Timeout interval
   * @returns {functions} setExternalClock
   * @returns {functions} setInternalClock
   */
  Scheduler.setClock = async interval => {
    try {
      logger.publish(3, `${collectionName}`, 'setClock:req', {
        clusterMode: process.env.CLUSTER_MODE,
        externalTimer: process.env.EXTERNAL_TIMER,
        timerUrl: process.env.TIMER_SERVER_URL,
      });
      if (process.env.EXTERNAL_TIMER && process.env.TIMER_SERVER_URL) {
        await Scheduler.setExternalClock(interval);
        Scheduler.setInternalClock(checkExternalClock, interval * 2);
      } else {
        Scheduler.setInternalClock(Scheduler.onTick, interval);
      }
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'setClock:err', error);
    }
  };

  Scheduler.delClock = async () => {
    logger.publish(3, `${collectionName}`, 'delClock:req', {
      clusterMode: process.env.CLUSTER_MODE,
      externalTimer: process.env.EXTERNAL_TIMER,
      timerUrl: process.env.TIMER_SERVER_URL,
    });
    try {
      if (process.env.EXTERNAL_TIMER && process.env.TIMER_SERVER_URL) {
        const scheduler = JSON.parse(await Scheduler.get(schedulerClockId));
        if (scheduler && scheduler !== null) {
          await deleteTimer(scheduler.timerId);
          await Scheduler.delete(schedulerClockId);
        }
      } else {
        await Scheduler.timer.stop();
      }
    } catch (error) {
      logger.publish(3, `${collectionName}`, 'delClock:err', error);
    }
  };

  /**
   * Event reporting that application started
   *
   * Trigger Scheduler starting routine
   *
   * @event stopped
   * @returns {functions | null} Scheduler.setClock
   */
  Scheduler.once('started', () =>
    utils.isMasterProcess(process.env)
      ? setTimeout(() => Scheduler.setClock(clockInterval), 2500)
      : null,
  );

  /**
   * Event reporting that application stopped
   *
   * Trigger Scheduler stopping routine
   *
   * @event stopped
   * @returns {functions | null} Scheduler.delClock
   */
  Scheduler.on('stopped', () => (utils.isMasterProcess(process.env) ? Scheduler.delClock() : null));

  /**
   * Event reporting tick
   *
   * Trigger Scheduler tick routine
   *
   * @event tick
   * @returns {functions} Scheduler.onTick
   */
  Scheduler.on('tick', Scheduler.onTick);

  /**
   * Event reporting that a Scheduler method is requested
   * @event before_*
   * @param {object} ctx - Express context
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @returns {function} Scheduler~onBeforeRemote
   */
  Scheduler.beforeRemote('**', async ctx => onBeforeRemote(Scheduler.app, ctx));

  Scheduler.afterRemoteError('*', (ctx, next) => {
    logger.publish(2, `${collectionName}`, `after ${ctx.methodString}:err`, ctx.error);
    next();
  });

  Scheduler.disableRemoteMethodByName('get');
  Scheduler.disableRemoteMethodByName('set');
  Scheduler.disableRemoteMethodByName('keys');
  Scheduler.disableRemoteMethodByName('iterateKeys');
  Scheduler.disableRemoteMethodByName('ttl');
  Scheduler.disableRemoteMethodByName('expire');
};
