/* Copyright 2019 Edouard Maleix, read LICENSE */

/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { publish } from 'iot-agent';
import debounce from 'lodash.debounce';
import logger from '../services/logger';
import DeltaTimer from '../services/delta-timer';

const collectionName = 'Scheduler';
const clockInterval = 5000;
const schedulerClockId = `scheduler-clock`;
// store timers in memory when using internal timer
const timers = {};
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
  Scheduler.publish = async (device, scheduler, method) => {
    try {
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

        if (device.appIds && device.appIds.length > 0) {
          const pubPromises = device.appIds.map(async appId => {
            try {
              const parts = packet.topic.split('/');
              parts[0] = appId;
              const topic = parts.join('/');
              Scheduler.app.emit('publish', topic, packet.payload, false, 0);
              return topic;
            } catch (error) {
              return null;
            }
          });
          await Promise.all(pubPromises);
        }
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

  const stopExternalTimer = async (device, sensor, client, scheduler) => {
    try {
      // if (!process.env.EXTERNAL_TIMER || !process.env.TIMER_SERVER_URL) return null;
      if (!scheduler || !scheduler.timerId) throw new Error('Missing timer');
      logger.publish(4, `${collectionName}`, 'stopExternalTimer:req', scheduler);
      await Scheduler.delete(`sensor-${sensor.id}`);
      await deleteTimer(scheduler.timerId);
      await Scheduler.publish(device, scheduler, 'DELETE', client);
      return scheduler.lastTime;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'stopExternalTimer:err', error);
      return null;
    }
  };

  const stopInternalTimer = async (device, sensor, client, scheduler) => {
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
        await Scheduler.publish(device, scheduler, 'DELETE', client);
        // if sensor.resources['5525'] > 0 setTimeout to update 5543
      }
      return lastTime;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'stopInternalTimer:err', error);
      return null;
    }
  };

  const stopTimer = async (device, sensor, client, mode = 0) => {
    try {
      logger.publish(4, `${collectionName}`, 'stopTimer:req', { sensorId: sensor.id, mode });
      const scheduler = JSON.parse(await Scheduler.get(`sensor-${sensor.id}`));
      if (process.env.EXTERNAL_TIMER && process.env.TIMER_SERVER_URL) {
        await stopExternalTimer(device, sensor, client, scheduler);
      } else {
        await stopInternalTimer(device, sensor, client, scheduler);
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
        // console.log('Pause lastTime :', lastTime, 'timeLeft : ', timeLeft);
      } else {
        // console.log('Stop lastTime : ', lastTime);
        sensor.resources['5538'] = 0;
        sensor.resources['5523'] = 'stopped';
      }
      sensor.resources['5543'] = 0;
      sensor.resources['5850'] = 0;
      return { sensor, scheduler };
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'stopTimer:err', error);
      throw error;
    }
  };

  /**
   * Scheduler timeout callback ( sensor timers )
   * @method module:Scheduler~onTimeout
   * @param {object} data - Timer callback data
   * @returns {object} payload - Updated timeout
   */
  const onTimeout = async data => {
    try {
      if (!data || data === null || typeof data !== 'object') {
        throw new Error('Missing data inputs');
      }
      const deviceId = data.deviceId;
      const sensorId = data.sensorId;
      if (!deviceId || deviceId === null) throw new Error('Missing device Id');
      if (!sensorId || sensorId === null) throw new Error('Missing sensor Id');
      const device = await Scheduler.app.models.Device.findById(deviceId);
      const sensor = await Scheduler.app.models.SensorResource.getCache(deviceId, sensorId);
      const mode = sensor.resources['5526'];
      logger.publish(4, `${collectionName}`, 'onTimeout:mode', sensor.resources['5526']);

      switch (mode) {
        case 0:
          // immediate
          sensor.resources['5523'] = 'stopped';
          sensor.resources['5850'] = 0;
          sensor.resources['5538'] = 0;
          sensor.resources['5543'] = 1;
          await stopTimer(device, sensor, null, 0);
          break;
        case 1:
          // timeout
          sensor.resources['5523'] = 'stopped';
          sensor.resources['5850'] = 0;
          sensor.resources['5538'] = 0;
          sensor.resources['5543'] = 1;
          await stopTimer(device, sensor, null, 0);
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
      return Scheduler.app.models.Sensor.createOrUpdate(device, sensor, 5543, 1);
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'onTimeout:err', error);
      throw error;
    }
  };

  const startExternalTimer = async (device, sensor, client, scheduler) => {
    try {
      if (!process.env.EXTERNAL_TIMER || !process.env.TIMER_SERVER_URL) return null;
      logger.publish(3, `${collectionName}`, 'startExternalTimer:req', scheduler);
      let baseUrl = Scheduler.app.get('url');
      if (!baseUrl) {
        baseUrl = process.env.HTTP_SERVER_URL;
      }
      const timer = {
        timeout: scheduler.interval,
        data: {
          sensorId: sensor.id,
          deviceId: device.id.toString(),
          secret: process.env.ALOES_KEY,
        },
        callback: {
          transport: 'http',
          method: 'post',
          uri: `${baseUrl}${process.env.REST_API_ROOT}/${collectionName}s/on-timeout`,
          // uri: `${baseUrl}${process.env.REST_API_ROOT}/${process.env.REST_API_VERSION}/${collectionName}s/on-timeout`;
        },
      };

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
          deviceId: device.id,
          interval: scheduler.interval,
        };
        await Scheduler.set(`sensor-${sensor.id}`, JSON.stringify(scheduler));
        await Scheduler.publish(device, scheduler, 'POST', client);
      }
      return lastTime;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'startExternalTimer:err', error);
      return null;
    }
  };

  const startInternalTimer = async (device, sensor, client, scheduler) => {
    try {
      let timer = timers[`${sensor.id}`];
      logger.publish(3, `${collectionName}`, 'startInternalTimer:req', scheduler);
      let lastTime;
      if (timer && timer !== null) {
        lastTime = timer.stop();
        delete timers[`${sensor.id}`];
      } else {
        timer = new DeltaTimer(
          onTimeout,
          { sensorId: sensor.id, deviceId: device.id },
          scheduler.interval,
        );
        timers[`${sensor.id}`] = timer;
      }
      lastTime = timer.start();
      scheduler = {
        stopTime: Date.now() + scheduler.interval,
        lastTime,
        sensorId: sensor.id,
        deviceId: device.id,
        interval: scheduler.interval,
      };
      await Scheduler.set(`sensor-${sensor.id}`, JSON.stringify(scheduler));
      await Scheduler.publish(device, scheduler, 'POST', client);
      return lastTime;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'startInternalTimer:err', error);
      return null;
    }
  };

  const startTimer = async (device, sensor, client, mode = 0) => {
    try {
      let scheduler = JSON.parse(await Scheduler.get(`sensor-${sensor.id}`));
      // let scheduler = await Scheduler.get(`sensor-${sensor.id}`);
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
        await startExternalTimer(device, sensor, client, scheduler);
      } else {
        await startInternalTimer(device, sensor, client, scheduler);
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
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'startTimer:err', error);
      throw error;
    }
  };

  /**
   * Endpoint for Sensor timers hooks
   * @method module:Scheduler.onTimeout
   * @param {object} body - Timer callback data
   * @returns {function} Scheduler~onTimeout
   */
  Scheduler.onTimeout = async body => {
    try {
      if (!body || body === null || typeof body !== 'object') {
        throw new Error('Missing data inputs');
      }
      logger.publish(4, `${collectionName}`, 'onTimeout:req', body);
      // if (!body.secret || (body.secret && body.secret !== process.env.ALOES_KEY)) {
      //   return null;
      // }
      // const onTimeoutHook = debounce(onTimeout, 250);
      // await onTimeoutHook(body);
      await onTimeout(body);
      return true;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'onTimeout:err', error);
      throw error;
    }
  };

  // function* waitAndDo(times) {
  //   for (var i = 0; i < times; i++) {
  //     // Sleep
  //     yield function(callback) {
  //       setTimeout(callback, 1000);
  //     };

  //     // Do something here
  //     console.log('Doing a request');
  //   }
  // }

  const parseTimerEvent = async (device, sensor, client) => {
    try {
      let result;
      logger.publish(4, `${collectionName}`, 'parseTimerEvent:req', sensor.resources['5523']);
      switch (sensor.resources['5523']) {
        case 'start':
          result = await startTimer(device, sensor, client);
          break;
        case 'stop':
          result = await stopTimer(device, sensor, client);
          break;
        case 'pause':
          result = await stopTimer(device, sensor, client, 1);
          break;
        case 'restart':
          result = await startTimer(device, sensor, client, 1);
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

      if (!result || !result.sensor) {
        throw new Error('Event parsed with error');
      }
      return result;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'parseTimerEvent:err', error);
      throw error;
    }
  };

  const parseTimerState = async (device, sensor, client) => {
    try {
      let result;
      logger.publish(4, `${collectionName}`, 'parseTimerState:req', sensor.resources['5850']);
      switch (sensor.resources['5850']) {
        case 0:
          result = await stopTimer(device, sensor, client);
          break;
        case 1:
          result = await startTimer(device, sensor, client);
          break;
        default:
          logger.publish(
            3,
            `${collectionName}`,
            'parseTimerState:notFound',
            sensor.resources['5850'],
          );
      }
      if (!result || !result.sensor) {
        throw new Error('Event parsed with error');
      }
      return result;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'parseTimerState:err', error);
      throw error;
    }
  };

  /**
   * Create or update scheduler stored in cache
   * @method module:Scheduler.createOrUpdate
   * @param {object} device - found Device instance
   * @param {object} sensor - found Sensor instance
   * @param {object} [client] - MQTT client
   * @returns {object} scheduler - Updated scheduler
   */
  Scheduler.createOrUpdate = async (device, sensor, client) => {
    try {
      let scheduler = {};
      switch (sensor.resource) {
        case 5521:
          // duration of the time delay
          break;
        case 5523:
          // Trigger initing actuation
          scheduler = await parseTimerEvent(device, sensor, client);
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
          scheduler = await parseTimerState(device, sensor, client);
          break;
        default:
          throw new Error('wrong resource');
      }
      return scheduler;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'createOrUpdate:err', error);
      throw error;
    }
  };

  /**
   * Iterate over each Scheduler keys found in cache
   * @method module:Scheduler.cacheIterator
   * @param {object} [filter] - Scheduler filter
   * @returns {string} key - Cached key
   */
  Scheduler.cacheIterator = async function*(filter) {
    const iterator = Scheduler.iterateKeys(filter);
    try {
      const key = await iterator.next();
      if (!key) {
        return;
      }
      yield key;
    } catch (e) {
      logger.publish(3, `${collectionName}`, 'cacheIterator:err', e);
      return;
    } finally {
      logger.publish(5, `${collectionName}`, 'cacheIterator:res', 'done');
    }
  };

  /**
   * Find schedulers in the cache and add to device instance
   * @method module:Scheduler.getAll
   * @param {object} [filter] - Scheduler filter
   * @returns {array} schedulers - Cached schedulers
   */
  Scheduler.getAll = async filter => {
    try {
      logger.publish(4, `${collectionName}`, 'getAll:req', { filter });
      const schedulers = [];
      for await (const key of Scheduler.cacheIterator(filter)) {
        if (key && key !== null) {
          try {
            const scheduler = JSON.parse(await Scheduler.get(key));
            schedulers.push(scheduler);
          } catch (e) {
            // empty
          }
        }
      }
      return schedulers;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'getAll:err', error);
      throw error;
    }
  };

  /**
   * Delete schedulers stored in cache
   * @method module:Scheduler.deleteAll
   * @param {object} [filter] - Scheduler filter
   * @returns {array} schedulers - Cached schedulers keys
   */
  Scheduler.deleteAll = async filter => {
    try {
      const schedulers = [];
      logger.publish(4, `${collectionName}`, 'deleteAll:req', { filter });
      for await (const key of Scheduler.cacheIterator(filter)) {
        if (key && key !== null) {
          schedulers.push(key);
          await Scheduler.delete(key);
        }
      }
      return schedulers;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'deleteAll:err', error);
      throw error;
    }
  };

  /**
   * Scheduler timeout callback ( scheduler clock )
   *
   * Update every sensor having an active scheduler
   *
   * @method module:Scheduler~onTick
   * @param {object} data - Timer callback data
   * @returns {object} payload; - Updated timeout
   */
  const onTick = async data => {
    try {
      const topic = `aloes-${process.env.ALOES_ID}/${collectionName}/HEAD`;
      const payload = { date: new Date(data.time), time: data.time, lastTime: data.lastTime };
      const schedulers = await Scheduler.getAll({ match: 'sensor-*' });
      logger.publish(4, `${collectionName}`, 'onTick:req', { schedulersCount: schedulers.length });
      const promises = schedulers.map(async scheduler => {
        try {
          let timeLeft = Math.round((scheduler.stopTime - Date.now()) / 1000);
          const device = await Scheduler.app.models.Device.findById(scheduler.deviceId);
          const sensor = await Scheduler.app.models.SensorResource.getCache(
            scheduler.deviceId,
            scheduler.sensorId,
          );
          sensor.resources['5544'] += Math.round(data.delay / 1000);
          sensor.resources['5543'] = 0;
          sensor.resources['5850'] = 1;
          sensor.resources['5523'] = 'started';

          const clients = await Scheduler.app.models.Client.getAll({ match: `${device.ownerId}*` });
          const client = clients.length ? clients[0] : null;
          if (timeLeft <= 0) {
            timeLeft = 0;
            // in case timer callback/webhook was not triggered
            await stopTimer(device, sensor, client);
          }
          logger.publish(3, `${collectionName}`, 'onTick:res', { timeLeft, client });
          return Scheduler.app.models.Sensor.createOrUpdate(device, sensor, 5538, timeLeft, client);
        } catch (error) {
          return null;
        }
      });
      await Promise.all(promises);
      Scheduler.app.emit('publish', topic, payload, false, 0);
      return { payload, topic };
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'onTick:err', error);
      throw error;
    }
  };

  /**
   * Scheduler timeout callback ( scheduler clock )
   *
   * validate webhook content before dispatch
   *
   * @method module:Scheduler~onTickHook
   * @param {object} body - Timer callback data
   * @returns {function} Scheduler~onTick
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
          return scheduler;
        }
        // logger.publish(4, `${collectionName}`, 'onTick:res', payload);
        // const deltaTime = thisTime - scheduler.lastTime;
        // const interval = Math.max(clockInterval - deltaTime, 0);
        const diff = Date.now() - scheduler.stopTime;
        logger.publish(3, `${collectionName}`, 'onTickHook:diff', {
          stopTime: scheduler.stopTime,
          diff,
        });
        if (diff <= 0) {
          return scheduler;
        }
      }
      await Scheduler.set(schedulerClockId, JSON.stringify({ ...scheduler, isUpdating: true }));

      const thisTime = +new Date();
      const payload = {
        date: new Date(thisTime),
        time: thisTime,
        lastTime: scheduler.lastTime || +new Date(),
      };

      let baseUrl = Scheduler.app.get('url');
      if (!baseUrl) {
        baseUrl = process.env.HTTP_SERVER_URL;
      }
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
      }
      return onTick(payload);
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'onTickHook:err', error);
      throw error;
    }
  };

  /**
   * Endpoint for Scheduler external timeout hooks
   * @method module:Scheduler.onTick
   * @param {object} body - Timer callback data
   * @returns {function} Scheduler~onTickHook
   */
  Scheduler.onTick = async body => {
    try {
      if (!body) return null;
      if (!body.secret || (body.secret && body.secret !== process.env.ALOES_KEY)) {
        return null;
      }
      const hook = debounce(onTickHook, 150);
      return hook(body);
      // return onTickHook(body);
    } catch (error) {
      throw error;
    }
  };

  Scheduler.setExternalClock = async interval => {
    try {
      let scheduler = JSON.parse(await Scheduler.get(schedulerClockId));
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
      if (!scheduler || scheduler === null) {
        scheduler = {};
      }

      let baseUrl = Scheduler.app.get('url');
      if (!baseUrl) {
        baseUrl = process.env.HTTP_SERVER_URL;
      }
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
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'setExternalClock:err', error);
      throw error;
    }
  };

  const checkExternalClock = async () => {
    try {
      logger.publish(3, `${collectionName}`, 'checkExternalClock:req', '');
      await Scheduler.setExternalClock(clockInterval);
      // return Scheduler.setInternalClock(checkExternalClock, clockInterval * 2);
    } catch (error) {
      throw error;
    }
  };

  Scheduler.setInternalClock = async (callback, interval) => {
    try {
      logger.publish(4, `${collectionName}`, 'setInternalClock:req', interval);
      if (Scheduler.timer && Scheduler.timer !== null) {
        Scheduler.timer.stop();
      }
      Scheduler.timer = new DeltaTimer(callback, {}, interval);
      Scheduler.start = Scheduler.timer.start();
      logger.publish(3, `${collectionName}`, 'setInternalClock:res', Scheduler.start);
      return Scheduler.timer;
    } catch (error) {
      throw error;
    }
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
      if (process.env.CLUSTER_MODE) {
        if (process.env.PROCESS_ID !== '0') return null;
        if (process.env.INSTANCES_PREFIX && process.env.INSTANCES_PREFIX !== '1') return null;
      }
      logger.publish(3, `${collectionName}`, 'setClock:req', {
        clusterMode: process.env.CLUSTER_MODE,
        externalTimer: process.env.EXTERNAL_TIMER,
        timerUrl: process.env.TIMER_SERVER_URL,
      });
      if (process.env.EXTERNAL_TIMER && process.env.TIMER_SERVER_URL) {
        await Scheduler.setExternalClock(interval);
        return Scheduler.setInternalClock(checkExternalClock, interval * 2);
      }
      return Scheduler.setInternalClock(onTick, interval);
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'setClock:err', error);
      return null;
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
          return Scheduler.delete(schedulerClockId);
        }
        return null;
      }
      return Scheduler.timer.stop();
    } catch (e) {
      return null;
    }
  };

  /**
   * Event reporting that application started
   *
   * Trigger Scheduler starting routine
   *
   * @event stopped
   * @returns {functions} Scheduler.setClock
   */
  Scheduler.once('started', () => setTimeout(() => Scheduler.setClock(clockInterval), 2500));

  /**
   * Event reporting that application stopped
   *
   * Trigger Scheduler stopping routine
   *
   * @event stopped
   * @returns {functions} Scheduler.delClock
   */
  Scheduler.on('stopped', async () => {
    try {
      if (process.env.CLUSTER_MODE) {
        if (process.env.PROCESS_ID !== '0') return null;
        if (process.env.INSTANCES_PREFIX && process.env.INSTANCES_PREFIX !== '1') return null;
      }
      logger.publish(3, `${collectionName}`, 'on-stop:res', '');
      return Scheduler.delClock();
      // return Scheduler.deleteAll({ match: schedulerClockId });
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'on-stop:err', error);
      return null;
    }
  });

  Scheduler.disableRemoteMethodByName('get');
  Scheduler.disableRemoteMethodByName('set');
  Scheduler.disableRemoteMethodByName('keys');
  Scheduler.disableRemoteMethodByName('iterateKeys');
  Scheduler.disableRemoteMethodByName('ttl');
  Scheduler.disableRemoteMethodByName('expire');
};
