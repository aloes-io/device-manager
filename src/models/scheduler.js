/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { publish } from 'iot-agent';
import debounce from 'lodash.debounce';
import logger from '../services/logger';
import DeltaTimer from '../services/delta-timer';

/**
 * @module Scheduler
 * @property {String} id Scheduler ID
 * @property {String} [name] Scheduler name
 * @property {String} [model] Aloes model ( Application, Device, ... )
 */

// store timers in memory
const timers = {};

module.exports = function(Scheduler) {
  const collectionName = 'Scheduler';
  const clockInterval = 5000;
  const schedulerClockId = `scheduler-clock`;

  Scheduler.disableRemoteMethodByName('get');
  Scheduler.disableRemoteMethodByName('set');
  Scheduler.disableRemoteMethodByName('keys');
  Scheduler.disableRemoteMethodByName('iterateKeys');
  Scheduler.disableRemoteMethodByName('ttl');
  Scheduler.disableRemoteMethodByName('expire');

  /**
   * Format packet and send it via MQTT broker
   * @method module:Scheduler.publish
   * @param {object} device - found Device instance
   * @param {object} measurement - Scheduler instance
   * @param {string} [method] - MQTT method
   * @param {object} [client] - MQTT client target
   * @returns {function} Scheduler.app.publish()
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
          await device.appIds.map(async appId => {
            try {
              const parts = packet.topic.split('/');
              parts[0] = appId;
              const topic = parts.join('/');
              await Scheduler.app.publish(topic, packet.payload, false, 0);
              return topic;
            } catch (error) {
              return error;
            }
          });
        }
        return Scheduler.app.publish(packet.topic, packet.payload, false, 0);
      }
      throw new Error('Invalid MQTT Packet encoding');
    } catch (error) {
      return error;
    }
  };

  const createTimer = async timer => {
    const timerApi = Scheduler.app.datasources.timer;
    return new Promise((resolve, reject) => {
      timerApi.create(timer, (err, body, res) => (err ? reject(err) : resolve(res.headers)));
    });
  };

  // const updateTimer = async (timerId, timer) => {
  //   const timerApi = Scheduler.app.datasources.timer;
  //   return new Promise((resolve, reject) => {
  //     timerApi.updateById(timerId, timer, (err, body, res) =>
  //       err ? reject(err) : resolve(res.headers),
  //     );
  //   });
  // };

  const deleteTimer = async timerId => {
    const timerApi = Scheduler.app.datasources.timer;
    return new Promise((resolve, reject) => {
      timerApi.deleteById(timerId, (err, body, res) => (err ? reject(err) : resolve(res.headers)));
    });
  };

  const stopExternalTimer = async (device, sensor, client, scheduler) => {
    try {
      // if (!process.env.EXTERNAL_TIMER || !process.env.TIMER_BASE_URL) return null;
      if (!scheduler || !scheduler.timerId) return null;
      logger.publish(4, `${collectionName}`, 'stopExternalTimer:req', scheduler);
      await Scheduler.delete(`sensor-${sensor.id}`);
      await Scheduler.publish(device, scheduler, 'DELETE', client);
      await deleteTimer(scheduler.timerId);
      return scheduler.lastTime;
    } catch (error) {
      return error;
    }
  };

  const stopInternalTimer = async (device, sensor, client, scheduler) => {
    try {
      const timer = timers[`${sensor.id}`];
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
      if (!timer && !scheduler) throw new Error('Missing timer');
      return lastTime;
    } catch (error) {
      return error;
    }
  };

  const stopTimer = async (device, sensor, client, mode = 0) => {
    try {
      const scheduler = JSON.parse(await Scheduler.get(`sensor-${sensor.id}`));
      let lastTime;
      logger.publish(4, `${collectionName}`, 'stopTimer:req', mode);
      if (process.env.EXTERNAL_TIMER && process.env.TIMER_BASE_URL) {
        lastTime = await stopExternalTimer(device, sensor, client, scheduler);
      } else {
        lastTime = await stopInternalTimer(device, sensor, client, scheduler);
      }

      if (mode === 1) {
        const stopTime = scheduler
          ? scheduler.stopTime
          : Date.now() + sensor.resources['5521'] * 1000;

        console.log('Pause stopTime :', stopTime);
        const timeLeft = Math.round((stopTime - Date.now()) / 1000);
        if (typeof timeLeft === 'number' && !isNaN(timeLeft)) {
          sensor.resources['5538'] = timeLeft;
        }
        sensor.resources['5523'] = 'paused';
        console.log('Pause lastTime :', lastTime, 'timeLeft : ', timeLeft);
      } else {
        // console.log('Stop lastTime : ', lastTime);
        sensor.resources['5538'] = 0;
        sensor.resources['5523'] = 'stopped';
      }
      sensor.resources['5543'] = 0;
      sensor.resources['5850'] = 0;
      return { sensor, scheduler };
    } catch (error) {
      return error;
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
          sensor.resources['5523'] = 'stopped';
          sensor.resources['5850'] = 0;
          sensor.resources['5538'] = 0;
          sensor.resources['5543'] = 1;
          await stopTimer(device, sensor, null, 0);
          break;
        case 1:
          sensor.resources['5523'] = 'stopped';
          sensor.resources['5850'] = 0;
          sensor.resources['5538'] = 0;
          sensor.resources['5543'] = 1;
          await stopTimer(device, sensor, null, 0);
          break;
        case 2:
          sensor.resources['5538'] = sensor.resources['5521'];
          sensor.resources['5523'] = 'ticked';
          sensor.resources['5543'] = 1;
          sensor.resources['5850'] = 1;
          break;
        default:
          throw new Error('Wrong timer type');
      }
      sensor.resources['5534'] += 1;
      return Scheduler.app.models.Sensor.createOrUpdate(
        device,
        sensor,
        5543,
        1,
        //  client,
      );
    } catch (error) {
      console.log('onTimeout err:', error);
      return error;
    }
  };

  const startExternalTimer = async (device, sensor, client, scheduler) => {
    try {
      if (!process.env.EXTERNAL_TIMER || !process.env.TIMER_BASE_URL) return null;
      logger.publish(4, `${collectionName}`, 'startExternalTimer:req', scheduler);
      let baseUrl = Scheduler.app.get('url');
      if (!baseUrl) {
        baseUrl = process.env.HTTP_SERVER_URL;
      }
      const timer = {
        timeout: scheduler.timeOut,
        data: {
          sensorId: sensor.id,
          deviceId: device.id.toString(),
          secret: process.env.SESSION_SECRET,
        },
        callback: {
          transport: 'http',
          method: 'post',
          uri: `${baseUrl}${process.env.REST_API_ROOT}/${collectionName}s/on-timeout`,
        },
      };

      const response = await createTimer(timer);
      const lastTime = +new Date();

      if (response && response.location && response.location.split('/')) {
        const timerId = response.location.split('/')[2];
        scheduler = {
          stopTime: Date.now() + scheduler.timeOut,
          lastTime,
          timerId,
          sensorId: sensor.id,
          deviceId: device.id,
        };
        await Scheduler.set(`sensor-${sensor.id}`, JSON.stringify(scheduler));
        await Scheduler.publish(device, timer, 'POST', client);
      }
      return lastTime;
    } catch (error) {
      return error;
    }
  };

  const startInternalTimer = async (device, sensor, client, scheduler) => {
    try {
      let timer = timers[`${sensor.id}`];
      logger.publish(4, `${collectionName}`, 'startInternalTimer:req', scheduler);

      let lastTime;
      if (timer && timer !== null) {
        lastTime = timer.stop();
        delete timers[`${sensor.id}`];
      } else {
        timer = new DeltaTimer(
          onTimeout,
          { sensorId: sensor.id, deviceId: device.id },
          scheduler.timeOut,
        );
        timers[`${sensor.id}`] = timer;
      }
      lastTime = timer.start();
      scheduler = {
        stopTime: Date.now() + scheduler.timeOut,
        lastTime,
        sensorId: sensor.id,
        deviceId: device.id,
      };
      await Scheduler.set(`sensor-${sensor.id}`, JSON.stringify(scheduler));
      await Scheduler.publish(device, timer, 'POST', client);
      return lastTime;
    } catch (error) {
      return error;
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
      scheduler.timeOut = sensor.resources['5521'] * 1000;
      if (sensor.resources['5526'] === 0) {
        scheduler.timeOut = 200;
      } else if (mode === 1) {
        scheduler.timeOut = sensor.resources['5538'] * 1000;
      }
      if (process.env.EXTERNAL_TIMER && process.env.TIMER_BASE_URL) {
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
      return error;
    }
  };

  // Scheduler.onTimeoutHook = debounce(onTimeout, 50);

  /**
   * Endpoint for Sensor timers hooks
   * @method module:Scheduler.onTimeout
   * @param {object} body - Timer callback data
   * @returns {functions} module:Scheduler~onTimeout
   */
  Scheduler.onTimeout = async body => {
    try {
      if (!body || body === null || typeof body !== 'object') {
        throw new Error('Missing data inputs');
      }
      logger.publish(4, `${collectionName}`, 'onTimeout:req', body);
      // if (!body.secret || (body.secret && body.secret !== process.env.SESSION_SECRET)) {
      //   return null;
      // }
      await onTimeout(body);
      return true;
    } catch (error) {
      console.log('onTimeout err:', error);
      return error;
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
            5,
            `${collectionName}`,
            'parseTimerEvent:notFound',
            sensor.resources['5523'],
          );
      }
      if (!result || !result.sensor || !result.scheduler) {
        throw new Error('Event parsed with error');
      }
      return result;
    } catch (error) {
      return error;
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
            5,
            `${collectionName}`,
            'parseTimerState:notFound',
            sensor.resources['5850'],
          );
      }
      if (!result || !result.sensor || !result.scheduler) {
        throw new Error('Event parsed with error');
      }
      return result;
    } catch (error) {
      return error;
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
      console.log('scheduler err:', error);
      return error;
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
      while (true) {
        const key = await iterator.next();
        // const key = iterator.next();
        if (!key) {
          return;
        }

        yield key;
      }
    } finally {
      logger.publish(5, `${collectionName}`, 'cacheIterator:res', 'over');
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
      logger.publish(5, `${collectionName}`, 'includeCache:req', '');
      const schedulers = [];
      for await (const key of Scheduler.cacheIterator(filter)) {
        if (key && key !== null) {
          const scheduler = JSON.parse(await Scheduler.get(key));
          schedulers.push(scheduler);
        }
      }
      return schedulers;
    } catch (err) {
      return err;
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
      logger.publish(4, `${collectionName}`, 'deleteAll:req', '');
      for await (const key of Scheduler.cacheIterator(filter)) {
        if (key && key !== null) {
          schedulers.push(key);
          await Scheduler.delete(key);
        }
      }
      return schedulers;
    } catch (error) {
      return error;
    }
  };

  /**
   * Scheduler timeout callback ( scheduler clock )
   *
   * Update every sensor having an active scheduler
   *
   * @method module:Scheduler~onTick
   * @param {object} data - Timer callback data
   * @returns {object} payload - Updated timeout
   */
  const onTick = async data => {
    try {
      const topic = `aloes-${process.env.ALOES_ID}/${collectionName}/HEAD`;
      const payload = { date: new Date(data.time), time: data.time, lastTime: data.lastTime };
      logger.publish(4, `${collectionName}`, 'onTick:req', payload.date);
      const schedulers = await Scheduler.getAll({ match: 'sensor-*' });
      const promises = await schedulers.map(async scheduler => {
        try {
          const timeLeft = Math.round((scheduler.stopTime - Date.now()) / 1000);
          console.log('active scheduler timeLeft', timeLeft);
          const device = await Scheduler.app.models.Device.findById(scheduler.deviceId);
          const sensor = await Scheduler.app.models.SensorResource.getCache(
            scheduler.deviceId,
            scheduler.sensorId,
          );
          if (timeLeft < 0) {
            // await stopTimer(device, sensor, null);
          }
          sensor.resources['5544'] += Math.round(data.delay / 1000);
          sensor.resources['5543'] = 0;
          sensor.resources['5850'] = 1;
          return Scheduler.app.models.Sensor.createOrUpdate(
            device,
            sensor,
            5538,
            timeLeft,
            //  client,
          );
        } catch (error) {
          return error;
        }
      });
      await Promise.all(promises);
      await Scheduler.app.publish(topic, payload, false, 0);
      return { payload, topic };
    } catch (error) {
      console.log(' onTick err', error);
      return error;
    }
  };

  /**
   * Scheduler timeout callback ( scheduler clock )
   *
   * validate webhook content before dispatch
   *
   * @method module:Scheduler~onTickHook
   * @param {object} body - Timer callback data
   * @returns {functions} module:Scheduler~onTick
   */
  const onTickHook = async body => {
    try {
      const scheduler = JSON.parse(await Scheduler.get(body.name));
      logger.publish(4, `${collectionName}`, 'onTick:req', scheduler);

      const thisTime = +new Date();
      const payload = {
        date: new Date(thisTime),
        time: thisTime,
        lastTime: scheduler.lastTime,
      };
      // logger.publish(4, `${collectionName}`, 'onTick:res', payload);
      // const deltaTime = thisTime - scheduler.lastTime;
      // const interval = Math.max(clockInterval - deltaTime, 0);
      // console.log('TIMER interval:', deltaTime, interval);
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
        },
      };

      const response = await createTimer(timer);
      if (response && response.location) {
        const timerId = response.location.split('/')[2];
        scheduler.stopTime = Date.now() + clockInterval;
        scheduler.lastTime = +new Date();
        scheduler.timerId = timerId;
        await Scheduler.set(`scheduler-clock`, JSON.stringify(scheduler));
      }

      return onTick(payload);
    } catch (error) {
      return error;
    }
  };

  Scheduler.onTickHook = debounce(onTickHook, 200);

  /**
   * Endpoint for Scheduler external timeout hooks
   * @method module:Scheduler.onTick
   * @param {object} body - Timer callback data
   * @returns {functions} module:Scheduler~onTickHook
   */
  Scheduler.onTick = async body => {
    try {
      if (!body) return null;
      if (!body.secret || (body.secret && body.secret !== process.env.SESSION_SECRET)) {
        return null;
      }
      return Scheduler.onTickHook(body);
    } catch (error) {
      return error;
    }
  };

  Scheduler.setExternalClock = async interval => {
    try {
      let scheduler = JSON.parse(await Scheduler.get(schedulerClockId));
      logger.publish(4, `${collectionName}`, 'setExternalClock:req', interval);
      if (scheduler && scheduler.timerId) {
        if (scheduler.stopTime > Date.now()) {
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
        data: { name: schedulerClockId, secret: process.env.SESSION_SECRET },
        callback: {
          transport: 'http',
          method: 'post',
          uri: `${baseUrl}${process.env.REST_API_ROOT}/${collectionName}s/on-tick`,
        },
      };
      logger.publish(4, `${collectionName}`, 'setExternalClock:callback', timer.callback.uri);

      const response = await createTimer(timer);
      if (response && response.location && response.location.split('/')) {
        const timerId = response.location.split('/')[2];
        scheduler = {
          stopTime: Date.now() + interval,
          lastTime: +new Date(),
          timerId,
        };
        await Scheduler.set(schedulerClockId, JSON.stringify(scheduler));
        logger.publish(4, `${collectionName}`, 'setExternalClock:res', { scheduler });
      }
      return scheduler;
    } catch (error) {
      return error;
    }
  };

  const checkExternalClock = async () => {
    try {
      const scheduler = JSON.parse(await Scheduler.get(schedulerClockId));
      logger.publish(4, `${collectionName}`, 'checkExternalClock:req', typeof scheduler);
      if (scheduler && scheduler.timerId && scheduler.stopTime > Date.now()) {
        return scheduler;
      }
      return Scheduler.setExternalClock(clockInterval);
    } catch (error) {
      return error;
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
      logger.publish(4, `${collectionName}`, 'setInternalClock:res', Scheduler.start);
      return Scheduler.timer;
    } catch (error) {
      return error;
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
    if (process.env.EXTERNAL_TIMER && process.env.TIMER_BASE_URL) {
      await Scheduler.setExternalClock(interval);
      return Scheduler.setInternalClock(checkExternalClock, interval * 2);
    }
    return Scheduler.setInternalClock(onTick, interval);
  };

  Scheduler.delClock = async () => {
    if (process.env.EXTERNAL_TIMER && process.env.TIMER_BASE_URL) {
      return Scheduler.delete(schedulerClockId);
    }
    return Scheduler.timer.stop();
  };

  Scheduler.once('attached', () => setTimeout(() => Scheduler.setClock(clockInterval), 2500));

  Scheduler.on('stopped', async () => Scheduler.deleteAll());
};
