/* Copyright 2020 Edouard Maleix, read LICENSE */

/* eslint-disable no-restricted-syntax */
import { publish } from 'iot-agent';
import { publishToDeviceApplications } from '../lib/models/device';
import {
  collectionName,
  clockInterval,
  deleteTimer,
  resetClock,
  onBeforeRemote,
  onTimeout,
  parseTimerEvent,
  parseTimerState,
  syncRunningTimers,
} from '../lib/models/scheduler';
import logger from '../services/logger';
import DeltaTimer from '../services/delta-timer';
import utils from '../lib/utils';

const schedulerClockId = `scheduler-clock`;

/**
 * @module Scheduler
 * @property {String} id Scheduler ID
 * @property {String} [name] Scheduler name
 * @property {String} [model] Aloes model ( Application, Device, ... )
 */

module.exports = function(Scheduler) {
  /**
   * Find schedulers in the cache and add to device instance
   * @async
   * @method module:Scheduler.getAll
   * @param {object} [filter] - Scheduler filter
   * @returns {Promise<array>} schedulers - Cached schedulers
   */
  Scheduler.getAll = async filter => {
    const schedulers = [];
    logger.publish(4, `${collectionName}`, 'getAll:req', { filter });
    for await (const key of utils.cacheIterator(Scheduler, filter)) {
      const scheduler = JSON.parse(await Scheduler.get(key));
      schedulers.push(scheduler);
    }
    return schedulers;
  };

  /**
   * Delete schedulers stored in cache
   * @async
   * @method module:Scheduler.deleteAll
   * @param {object} [filter] - Scheduler filter
   * @returns {Promise<array>} schedulers - Cached schedulers keys
   */
  Scheduler.deleteAll = async filter => {
    const schedulers = [];
    logger.publish(4, `${collectionName}`, 'deleteAll:req', { filter });
    for await (const key of utils.cacheIterator(Scheduler, filter)) {
      await Scheduler.delete(key);
      schedulers.push(key);
    }
    return schedulers;
  };

  /**
   * Format packet and send it via MQTT broker
   * @async
   * @method module:Scheduler.publish
   * @param {object} device - found Device instance
   * @param {object} measurement - Scheduler instance
   * @param {string} [method] - MQTT method
   * @param {object} [client] - MQTT client target
   * @fires Server.publish
   * @returns {Promise<object | null>} scheduler
   */
  Scheduler.publish = async (deviceId, scheduler, method) => {
    if (!deviceId) {
      throw utils.buildError(403, 'MISSING_DEVICE_ID', 'No device in arguments');
    }
    const device = await Scheduler.app.models.Device.findById(deviceId);
    if (!device) {
      throw utils.buildError(403, 'MISSING_DEVICE', 'No device found');
    }
    const packet = publish({
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
  };

  /**
   * Scheduler timeout callback / webhook ( sensor timer )
   * @async
   * @method module:Scheduler.onTimeout
   * @param {object} body - Timer callback body
   * @returns {Promise<function>} Scheduler~onTimeout
   */
  Scheduler.onTimeout = async body => {
    const { sensorId } = body;
    if (!sensorId) throw new Error('Missing sensor Id');
    logger.publish(4, `${collectionName}`, 'onTimeout:req', body);
    return onTimeout(Scheduler, sensorId);
    // return true;
  };

  /**
   * Create or update scheduler stored in cache
   * @async
   * @method module:Scheduler.createOrUpdate
   * @param {object} sensor - found Sensor instance
   * @param {object} [client] - MQTT client
   * @returns {Promise<object>} scheduler
   */
  Scheduler.createOrUpdate = async (sensor, client) => {
    let scheduler = {};
    switch (sensor.resource) {
      case 5521:
        // duration of the time delay
        break;
      case 5523:
        // Trigger initing actuation
        scheduler = await parseTimerEvent(Scheduler, sensor, client);
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
        scheduler = await parseTimerState(Scheduler, sensor, client);
        break;
      default:
        throw new Error('wrong resource');
    }
    // if (!scheduler ) {
    //   throw new Error('Event parsed with error');
    // }
    return scheduler;
  };

  /**
   * Scheduler tick event ( scheduler clock )
   *
   * Update every sensor having an active scheduler
   *
   * @async
   * @method module:Scheduler.onTick
   * @param {object} data - Timer event data
   * @fires Scheduler.publish
   * @returns {Promise<function>} Scheduler~syncRunningTimers
   */
  Scheduler.onTick = async data => {
    try {
      const { delay, time, lastTime } = data;
      if (!time || !lastTime) throw new Error('Missing event properties');
      const topic = `aloes-${process.env.ALOES_ID}/${collectionName}/HEAD`;
      const payload = { date: new Date(time), time, lastTime };
      logger.publish(4, `${collectionName}`, 'onTick:req', { payload });
      Scheduler.app.emit('publish', topic, payload, false, 0);
      return syncRunningTimers(Scheduler, delay);
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'onTick:err', error);
      return null;
    }
  };

  /**
   * Endpoint for Scheduler external timeout callback
   *
   * validate webhook content before dispatch
   *
   * @async
   * @method module:Scheduler.onTickHook
   * @param {object} body - Timer callback data
   * @fires Scheduler.tick
   * @returns {Promise<boolean>}
   */
  Scheduler.onTickHook = async body => {
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
      Scheduler.emit('tick', payload);

      scheduler = await resetClock(Scheduler.app, scheduler, clockInterval, body);
      await Scheduler.set(schedulerClockId, JSON.stringify(scheduler));
      logger.publish(3, `${collectionName}`, 'onTickHook:res', { scheduler });

      return true;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'onTickHook:err', error);
      return false;
    }
  };

  /**
   * Initialize external Clock to keep every active schedulers synchronized
   *
   * @async
   * @method module:Scheduler.setExternalClock
   * @param {number} interval - Interval between each tick
   * @returns {Promise<object>} scheduler
   */
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

    scheduler = await resetClock(Scheduler.app, scheduler, interval, {
      name: schedulerClockId,
      secret: process.env.ALOES_KEY,
    });
    await Scheduler.set(schedulerClockId, JSON.stringify(scheduler));
    logger.publish(3, `${collectionName}`, 'setExternalClock:res', { scheduler });

    return scheduler;
  };

  /**
   * Initialize internal Clock to insure external clock is alive
   *
   * @method module:Scheduler.setInternalClock
   * @param {function} callback
   * @param {number} interval
   * @returns {function} DeltaTimer
   */
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
   * Scheduler will use Skyring external timer handler
   *
   * @method module:Scheduler.setClock
   * @param {number} interval - Timeout interval
   */
  Scheduler.setClock = async interval => {
    try {
      logger.publish(3, `${collectionName}`, 'setClock:req', {
        clusterMode: process.env.CLUSTER_MODE,
        externalTimer: process.env.EXTERNAL_TIMER,
        timerUrl: process.env.TIMER_SERVER_URL,
      });
      await Scheduler.setExternalClock(interval);
      Scheduler.setInternalClock(
        async () => Scheduler.setExternalClock(clockInterval),
        interval * 2,
      );
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
      const scheduler = JSON.parse(await Scheduler.get(schedulerClockId));
      if (scheduler && scheduler !== null) {
        await deleteTimer(Scheduler.app, scheduler.timerId);
        await Scheduler.delete(schedulerClockId);
      }
      Scheduler.timer.stop();
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
   * @returns {Promise<functions | null>} Scheduler.setClock
   */
  Scheduler.once('started', async () =>
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
   * @returns {Promise<functions | null>} Scheduler.delClock
   */
  Scheduler.on('stopped', async () =>
    utils.isMasterProcess(process.env) ? Scheduler.delClock() : null,
  );

  /**
   * Event reporting tick
   *
   * Trigger Scheduler.onTick routine
   *
   * @event tick
   * @returns {Promise<functions>} Scheduler.onTick
   */
  Scheduler.on('tick', Scheduler.onTick);

  /**
   * Event reporting that a Scheduler method is requested
   * @event before_*
   * @param {object} ctx - Express context
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @returns {Promise<function>} Scheduler~onBeforeRemote
   */
  Scheduler.beforeRemote('**', onBeforeRemote);

  Scheduler.afterRemoteError('*', (ctx, next) => {
    logger.publish(2, `${collectionName}`, `after ${ctx.methodString}:err`, ctx.error);
    next();
  });

  /**
   * Optional error callback
   * @callback module:Scheduler~errorCallback
   * @param {error} ErrorObject
   */

  /**
   * Optional result callback
   * @callback module:Scheduler~resultCallback
   * @param {error} ErrorObject
   * @param {object} result
   */

  /**
   * Get Scheduler by key
   * Use callback or promise
   *
   * @method module:Scheduler.get
   * @param {string} key
   * @param {resultCallback} [cb] - Optional callback
   * @promise result
   */

  /**
   * Set Scheduler by key, with optional TTL
   *
   * Use callback or promise
   *
   * @method module:Scheduler.set
   * @param {string} key
   * @param {string} value
   * @param {number} [ttl]
   * @param {ErrorCallback} [cb] - Optional callback
   * @promise undefined
   */

  /**
   * Delete Scheduler by key
   *
   * Use callback or promise
   *
   * @method module:Scheduler.delete
   * @param {string} key
   * @param {ErrorCallback} [cb] - Optional callback
   * @promise undefined
   */

  /**
   * Set the TTL (time to live) in ms (milliseconds) for a given key
   *
   * Use callback or promise
   *
   * @method module:Scheduler.expire
   * @param {string} key
   * @param {number} [ttl]
   * @param {ErrorCallback} [cb] - Optional callback
   * @promise undefined
   */

  /**
   * Get all Scheduler keys
   *
   * Use callback or promise
   *
   * @method module:Scheduler.keys
   * @param {object} [filter]
   * @param {object} filter.match Glob string used to filter returned keys (i.e. userid.*)
   * @param {function} [cb]
   * @returns {string[]}
   */

  /**
   * Iterate over all Scheduler keys
   *
   * Use callback or promise
   *
   * @method module:Scheduler.iterateKeys
   * @param {object} [filter]
   * @param {object} filter.match Glob string used to filter returned keys (i.e. userid.*)
   * @returns {AsyncIterator} An Object implementing next(cb) -> Promise function that can be used to iterate all keys.
   */

  Scheduler.disableRemoteMethodByName('get');
  Scheduler.disableRemoteMethodByName('set');
  Scheduler.disableRemoteMethodByName('delete');
  Scheduler.disableRemoteMethodByName('keys');
  Scheduler.disableRemoteMethodByName('iterateKeys');
  Scheduler.disableRemoteMethodByName('ttl');
  Scheduler.disableRemoteMethodByName('expire');
};
