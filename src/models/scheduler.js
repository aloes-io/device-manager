/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { publish } from 'iot-agent';
import logger from '../services/logger';

/**
 * @module Scheduler
 * @property {String} id Scheduler ID
 * @property {String} [name] Scheduler name
 * @property {String} [model] Aloes model ( Application, Device, ... )
 */

// for tests store timers in memory
const timers = {};

module.exports = function(Scheduler) {
  const collectionName = 'Scheduler';
  const clockInterval = 10000;

  /**
   * Format packet and send it via MQTT broker
   * @method module:Scheduler.publish
   * @param {object} device - found Device instance
   * @param {object} measurement - Scheduler instance
   * @param {string} [method] - MQTT method
   * @param {object} [client] - MQTT client target
   * returns {function} Scheduler.app.publish()
   */
  Scheduler.publish = async (device, scheduler, method) => {
    try {
      const packet = await publish({
        userId: device.ownerId,
        collection: collectionName,
        //  modelId: job.id,
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

  Scheduler.onTimeout = async data => {
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
      console.log('onTimeout, timer mode', sensor.resources['5526']);

      switch (mode) {
        case 0:
          sensor.resources['5523'] = 'stopped';
          sensor.resources['5850'] = 0;
          sensor.resources['5538'] = 0;
          sensor.resources['5543'] = 1;
          if (timers[`${sensorId}`]) {
            timers[`${sensorId}`].stop();
            delete timers[`${sensor.id}`];
          }
          await Scheduler.delete(`${sensorId}`);
          break;
        case 1:
          sensor.resources['5523'] = 'stopped';
          sensor.resources['5850'] = 0;
          sensor.resources['5538'] = 0;
          sensor.resources['5543'] = 1;
          if (timers[`${sensorId}`]) {
            timers[`${sensorId}`].stop();
            delete timers[`${sensor.id}`];
          }
          await Scheduler.delete(`${sensorId}`);
          //  await Scheduler.publish(device, sensor, 'DELETE');
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
      sensor.resources['5534'] = +1;
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

  Scheduler.DeltaTimer = function(cb, data, interval) {
    try {
      let timeout, lastTime;
      let count = 0;

      const loop = () => {
        try {
          count += 1;
          const thisTime = +new Date();
          const deltaTime = thisTime - lastTime;
          const delay = Math.max(interval - deltaTime, 0);
          timeout = setTimeout(loop, delay);
          lastTime = thisTime + delay;
          data.delay = delay;
          data.count = count;
          data.time = thisTime;
          data.lastTime = lastTime;
          if (count > 1) cb(data);
          return null;
        } catch (error) {
          return error;
        }
      };

      const start = () => {
        try {
          timeout = setTimeout(loop, 0);
          lastTime = +new Date();
          logger.publish(4, `${collectionName}`, 'DeltaTimer:start', lastTime);
          return lastTime;
        } catch (error) {
          return error;
        }
      };

      const stop = () => {
        try {
          logger.publish(4, `${collectionName}`, 'DeltaTimer:stop', lastTime);
          clearTimeout(timeout);
          return lastTime;
        } catch (error) {
          return error;
        }
      };

      this.start = start;
      this.stop = stop;
      return timeout;
    } catch (error) {
      return error;
    }
  };

  const startTimer = async (device, sensor, client, mode = 0) => {
    try {
      let scheduler = await Scheduler.get(`${sensor.id}`);
      let timer = timers[`${sensor.id}`];
      if (timer && timer !== null) {
        console.log('Found timer instance', timer);
      }

      // todo improve timeLeft setting
      let millis = sensor.resources['5521'] * 1000;
      if (sensor.resources['5526'] === 0) {
        millis = 200;
      } else if (mode === 1) {
        millis = sensor.resources['5538'] * 1000;
      }
      let lastTime;
      if (timer && timer !== null) {
        lastTime = timer.stop();
        delete timers[`${sensor.id}`];
      } else {
        timer = new Scheduler.DeltaTimer(
          Scheduler.onTimeout,
          { sensorId: sensor.id, deviceId: device.id },
          millis,
        );
        timers[`${sensor.id}`] = timer;
      }
      scheduler = {
        stopTime: Date.now() + millis,
        timeOut: millis,
        sensorId: sensor.id,
        deviceId: device.id,
      };
      await Scheduler.set(`${sensor.id}`, JSON.stringify(scheduler));
      await Scheduler.publish(device, timer, 'POST', client);
      lastTime = timer.start();
      if (mode === 1) {
        if (!sensor.resources['5538']) {
          sensor.resources['5538'] = sensor.resources['5521'];
        }
        sensor.resources['5523'] = 'restarted';
        console.log('Restart lastTime', lastTime, 'interval :', sensor.resources['5528']);
      } else {
        sensor.resources['5538'] = sensor.resources['5521'];
        sensor.resources['5544'] = 0;
        sensor.resources['5523'] = 'started';
        console.log('Start lastTime', lastTime, 'interval :', sensor.resources['5521']);
      }
      sensor.resources['5543'] = 0;
      sensor.resources['5850'] = 1;
      return { sensor, scheduler };
    } catch (error) {
      return error;
    }
  };

  const stopTimer = async (device, sensor, client, mode = 0) => {
    try {
      const scheduler = await Scheduler.get(`${sensor.id}`);
      const timer = timers[`${sensor.id}`];
      let lastTime;
      if (timer) {
        lastTime = timer.stop();
        delete timers[`${sensor.id}`];
      }
      if (scheduler) {
        await Scheduler.delete(`${sensor.id}`);
        await Scheduler.publish(device, scheduler, 'DELETE', client);
        // if sensor.resources['5525'] > 0 setTimeout to update 5543
      }
      if (!timer && !scheduler) throw new Error('Missing timer');
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
        console.log('Stop lastTime : ', lastTime);
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

  const parseTimerEvent = async (device, sensor, client) => {
    try {
      let result;
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
   * returns {object} job - Updated cron job
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

  Scheduler.cacheIterator = async function*(filter) {
    const iterator = Scheduler.iterateKeys(filter);
    try {
      while (true) {
        const key = await iterator.next();
        //  const key = iterator.next();
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
   */
  Scheduler.getAll = async () => {
    try {
      logger.publish(5, `${collectionName}`, 'includeCache:req', '');
      const schedulers = [];
      for await (const key of Scheduler.cacheIterator()) {
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
   * Delete clients stored in cache
   * @method module:Scheduler.deleteAll
   * returns {array} clients - Cached schedulers keys
   */
  Scheduler.deleteAll = async () => {
    try {
      const schedulers = [];
      logger.publish(4, `${collectionName}`, 'deleteAll:req', '');
      for await (const key of Scheduler.cacheIterator()) {
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

  const tick = async data => {
    try {
      const topic = `ALOES_ID/${collectionName}/HEAD`;
      const payload = { date: new Date(data.time), time: data.time, lastTime: data.lastTime };
      logger.publish(4, `${collectionName}`, 'tick:res', payload.date);
      for await (const key of Scheduler.cacheIterator()) {
        if (key && key !== null) {
          console.log('active schedulers key', key);
          const scheduler = JSON.parse(await Scheduler.get(key));
          const timeLeft = Math.round((scheduler.stopTime - Date.now()) / 1000);
          console.log('active scheduler timeLeft', timeLeft);
          const device = await Scheduler.app.models.Device.findById(scheduler.deviceId);
          const sensor = await Scheduler.app.models.SensorResource.getCache(
            scheduler.deviceId,
            scheduler.sensorId,
          );
          sensor.resources['5544'] += Math.round(data.delay / 1000);
          sensor.resources['5543'] = 0;
          //  sensor.resources['5538'] = timeLeft;
          sensor.resources['5850'] = 1;
          return Scheduler.app.models.Sensor.createOrUpdate(
            device,
            sensor,
            5538,
            timeLeft,
            //  client,
          );
        }
      }
      await Scheduler.app.publish(topic, payload, false, 0);
      return { payload, topic };
    } catch (error) {
      console.log(' tick err', error);
      return error;
    }
  };

  Scheduler.setClock = interval => {
    if (Scheduler.timer && Scheduler.timer !== null) {
      Scheduler.timer.stop();
    }
    //  Scheduler.timer = setInterval(updateTimer, 5000);
    Scheduler.timer = new Scheduler.DeltaTimer(tick, {}, interval);
    Scheduler.start = Scheduler.timer.start();
    console.log('Set clock :', Scheduler.start);
    return Scheduler.timer;
  };

  Scheduler.once('attached', () => {
    Scheduler.setClock(clockInterval);
  });
};
