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
        logger.publish(4, `${collectionName}`, 'getCache:res', cachedSensor);
        return JSON.parse(cachedSensor);
      }
      return null;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'getCache:err', error);
      return null;
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
      logger.publish(4, `${collectionName}`, 'setCache:res', sensor);
      return sensor;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'setCache:err', error);
      return null;
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
      logger.publish(4, `${collectionName}`, 'deleteCache:res', key);
      return true;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'deleteCache:err', error);
      return null;
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
      logger.publish(4, `${collectionName}`, 'expireCache:res', { key, ttl });
      return true;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'expireCache:err', error);
      return null;
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
          const promises = await sensors.map(async sensor => {
            const cachedSensor = await SensorResource.getCache(device.id, sensor.id);
            if (cachedSensor && cachedSensor !== null) {
              delete cachedSensor.id;
              return sensor.updateAttributes(cachedSensor);
            }
            return null;
          });
          sensors = await Promise.all(promises);
        } else if (direction === 'DOWN') {
          // sync mongo with redis
          const promises = await sensors.map(async sensor =>
            SensorResource.setCache(device.id, sensor),
          );
          sensors = await Promise.all(promises);
        }
      }
      return sensors;
    } catch (error) {
      logger.publish(3, `${collectionName}`, 'syncCache:err', error);
      throw error;
    }
  };

  /**
   * Async generator sending cache key promise
   * @method module:SensorResource.cacheIterator
   * @param {object} filter - Key filter
   * @property {string} filter.match - glob string
   * @returns {string} key - Cached key
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
        if (key && key !== null) {
          try {
            const sensor = JSON.parse(await SensorResource.get(key));
            device.sensors.push(sensor);
          } catch (e) {
            // empty
          }
        }
      }
      return device;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'includeCache:err', error);
      throw error;
    }
  };

  /**
   * Update device's sensors stored in cache
   * @method module:SensorResource.updateCache
   * @param {object} device - Device instance
   * @returns {array} sensor
   */
  SensorResource.updateCache = async device => {
    try {
      const sensors = [];
      const filter = {
        match: `deviceId-${device.id}-sensorId-*`,
      };
      logger.publish(5, `${collectionName}`, 'updateCache:req', { filter });
      for await (const key of SensorResource.cacheIterator(filter)) {
        if (key && key !== null) {
          try {
            let sensor = JSON.parse(await SensorResource.get(key));
            sensor = {
              ...sensor,
              devEui: device.devEui,
              transportProtocol: device.transportProtocol,
              transportProtocolVersion: device.transportProtocolVersion,
              messageProtocol: device.messageProtocol,
              messageProtocolVersion: device.messageProtocolVersion,
            };
            await SensorResource.setCache(device.id, sensor);
            sensors.push(sensor);
          } catch (e) {
            // empty
          }
        }
      }

      return sensors;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'updateCache:err', error);
      throw error;
    }
  };

  /**
   * Delete sensor resources stored in cache
   * @method module:SensorResource.deleteAll
   * @returns {array} sensors - Cached sensors keys
   */
  SensorResource.deleteAll = async () => {
    try {
      const sensors = [];
      logger.publish(4, `${collectionName}`, 'deleteAll:req', '');
      for await (const key of SensorResource.cacheIterator()) {
        if (key && key !== null) {
          sensors.push(key);
          await SensorResource.delete(key);
        }
      }
      return sensors;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'deleteAll:err', error);
      throw error;
    }
  };
};
