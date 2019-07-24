/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import logger from '../services/logger';

/**
 * @module SensorResource
 * @property {String} sensor Stringified Sensor instance
 */
module.exports = function(SensorResource) {
  const collectionName = 'SensorResource';
  const filteredProperties = ['children', 'size', 'show', 'group', 'success', 'error'];

  SensorResource.disableRemoteMethodByName('count');
  SensorResource.disableRemoteMethodByName('upsertWithWhere');
  SensorResource.disableRemoteMethodByName('replaceOrCreate');
  SensorResource.disableRemoteMethodByName('createChangeStream');

  /**
   * Find Sensor instance from the cache
   * @method module:SensorResource.getCache
   * @param {string} deviceId - Device Id owning the sensor
   * @param {string} sensorId - Sensor instance Id
   * @returns {object} sensor
   */
  SensorResource.getCache = async (deviceId, sensorId) => {
    try {
      const resourceKey = `deviceId-${deviceId}-sensorId-${sensorId}`;
      const cachedSensor = await SensorResource.get(resourceKey);
      if (cachedSensor && cachedSensor !== null) {
        logger.publish(5, `${collectionName}`, 'getCache:res', cachedSensor);
        return JSON.parse(cachedSensor);
      }
      // ctx.res.setHeader("Cache-Hit", true);
      // const data = await ttlAsync(cacheKey);
      // console.log("[CACHE] beforeRemote:res1", data);
      // if (data) {
      //   ctx.res.setHeader("Cache-TTL", data);
      //   const expires = new Date();
      //   expires.setSeconds(expires.getSeconds() + Number(data));
      //   ctx.res.setHeader("Expires", expires);

      // ctx.res.setHeader('Cache-Hit', false);
      // ctx.res.setHeader('Cache-TTL', cacheExpire);
      // const expires = new Date();
      // expires.setSeconds(expires.getSeconds() + Number(cacheExpire));
      // ctx.res.setHeader('Expires', expires);

      throw new Error('No sensor found in cache');
    } catch (error) {
      return error;
    }
  };

  /**
   * Create or update sensor instance into the cache memory
   * @method module:SensorResource.setCache
   * @param {string} deviceId - Device Id owning the sensor
   * @param {object} sensor - Sensor instance to save
   * @param {number} [ttl] - Expire delay
   * @returns {object} sensor
   */
  SensorResource.setCache = async (deviceId, sensor, ttl) => {
    try {
      const key = `deviceId-${deviceId}-sensorId-${sensor.id}`;
      const promises = await filteredProperties.map(p => delete sensor[p]);
      await Promise.all(promises);
      if (typeof sensor !== 'string') {
        sensor = JSON.stringify(sensor);
      }
      if (ttl && ttl !== null) {
        await SensorResource.set(key, sensor, ttl);
      } else {
        await SensorResource.set(key, sensor);
      }
      logger.publish(5, `${collectionName}`, 'setCache:res', sensor);
      return sensor;
    } catch (error) {
      return error;
    }
  };

  /**
   * Set TTL for a sensor store in cache
   * @method module:SensorResource.expireCache
   * @param {string} deviceId - Device Id owning the sensor
   * @param {string} sensorId - Sensor instance Id
   * @returns {boolean} success
   */
  SensorResource.deleteCache = async (deviceId, sensorId) => {
    try {
      const key = `deviceId-${deviceId}-sensorId-${sensorId}`;
      await SensorResource.delete(key);
      logger.publish(5, `${collectionName}`, 'deleteCache:res', key);
      return true;
    } catch (error) {
      return error;
    }
  };

  /**
   * Set TTL for a sensor store in cache
   * @method module:SensorResource.expireCache
   * @param {string} deviceId - Device Id owning the sensor
   * @param {object} sensor - Sensor instance to save
   * @param {number} [ttl] - Sensor instance Id
   * @returns {boolean} success
   */
  SensorResource.expireCache = async (deviceId, sensorId, ttl) => {
    try {
      const key = `deviceId-${deviceId}-sensorId-${sensorId}`;
      if (!ttl) {
        ttl = 1;
      }
      await SensorResource.expire(key, ttl);
      logger.publish(5, `${collectionName}`, 'expireCache:res', { key, ttl });
      return true;
    } catch (error) {
      return error;
    }
  };

  /**
   * Synchronize cache memory with database on disk
   * @method module:Sensor.syncCache
   * @param {object} device - Device Instance to sync
   * @param {string} [direction] - UP to save on disk | DOWN to save on cache,
   */
  SensorResource.syncCache = async (device, direction = 'UP') => {
    try {
      let sensors = await device.sensors.find();
      logger.publish(4, `${collectionName}`, 'syncCache:req', { direction });
      if (sensors && sensors !== null) {
        if (direction === 'UP') {
          // sync redis with mongo
          const result = await sensors.map(async sensor => {
            const cachedSensor = await SensorResource.getCache(device.id, sensor.id);
            if (cachedSensor && cachedSensor !== null) {
              delete cachedSensor.id;
              return sensor.updateAttributes(cachedSensor);
            }
            return null;
          });
          sensors = await Promise.all(result);
        } else if (direction === 'DOWN') {
          // sync mongo with redis
          const result = await sensors.map(async sensor =>
            SensorResource.setCache(device.id, sensor),
          );
          sensors = await Promise.all(result);
        }
      }
      return sensors;
    } catch (error) {
      logger.publish(3, `${collectionName}`, 'syncCache:err', error);
      return error;
    }
  };

  /**
   * Async generator sending cache key promise
   * @method module:SensorResource.cacheIterator
   * @param {object} filter - Key filter
   * @property {string} filter.match - glob string
   */
  SensorResource.cacheIterator = async function*(filter) {
    const iterator = SensorResource.iterateKeys(filter);
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
   * Find sensors in the cache and add to device instance
   * @method module:SensorResource.includeCache
   * @param {object} device - device instance
   */
  SensorResource.includeCache = async device => {
    try {
      const filter = {
        match: `deviceId-${device.id}-sensorId-*`,
      };
      logger.publish(5, `${collectionName}`, 'includeCache:req', { filter });
      device.sensors = [];
      for await (const key of SensorResource.cacheIterator(filter)) {
        const sensor = JSON.parse(await SensorResource.get(key));
        device.sensors.push(sensor);
      }
      return device;
    } catch (err) {
      throw err;
    }
  };

  /**
   * Update device's sensors stored in cache
   * @method module:SensorResource.updateCache
   * @param {object} device - Device instance
   * returns {array} sensor
   */
  SensorResource.updateCache = async device => {
    try {
      const sensors = [];
      const filter = {
        match: `deviceId-${device.id}-sensorId-*`,
      };
      logger.publish(5, `${collectionName}`, 'updateCache:req', { filter });
      for await (const key of SensorResource.cacheIterator(filter)) {
        let sensor = JSON.parse(await SensorResource.get(key));
        sensor = {
          ...sensor,
          devEui: device.devEui,
          devAddr: device.devAddr,
          transportProtocol: device.transportProtocol,
          transportProtocolVersion: device.transportProtocolVersion,
          messageProtocol: device.messageProtocol,
          messageProtocolVersion: device.messageProtocolVersion,
        };
        await SensorResource.setCache(device.id, sensor);
        sensors.push(sensor);
      }

      return sensors;
    } catch (error) {
      return error;
    }
  };
};