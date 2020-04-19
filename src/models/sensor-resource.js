/* Copyright 2019 Edouard Maleix, read LICENSE */

/* eslint-disable no-restricted-syntax */
import logger from '../services/logger';
import utils from '../lib/utils';

const collectionName = 'SensorResource';

const setCacheKey = (deviceId, sensorId, resourceId) => {
  if (resourceId) {
    return `deviceId-${deviceId}-sensorId-${sensorId}-resourceId-${resourceId}`;
  }
  return `deviceId-${deviceId}-sensorId-${sensorId}-resourceId-*`;
};

/**
 * @module SensorResource
 * @property {String} resource Stringified Sensor resource instance
 */

module.exports = function(SensorResource) {
  /**
   * Get SensorResource instances stored in cache
   * @method module:SensorResource.deleteAll
   * @param {object} [filter] - Key filter
   * @returns {object[]} resources - Cached sensorResources
   */
  SensorResource.getAll = async filter => {
    const resources = [];
    logger.publish(4, `${collectionName}`, 'getAll:req', { filter });
    for await (const key of utils.cacheIterator(SensorResource, filter)) {
      const resource = JSON.parse(await SensorResource.get(key));
      resources.push(resource);
    }
    return resources;
  };

  /**
   * Delete SensorResource instance(s) stored in cache
   * @method module:SensorResource.deleteAll
   * @param {object} [filter] - Key filter
   * @returns {string[]} resources - Cached SensorResource keys
   */
  SensorResource.deleteAll = async filter => {
    const resources = [];
    logger.publish(4, `${collectionName}`, 'deleteAll:req', { filter });
    for await (const key of utils.cacheIterator(SensorResource, filter)) {
      await SensorResource.delete(key);
      resources.push(key);
    }
    return resources;
  };

  /**
   * Find SensorResource instance(s) from the cache
   * @method module:SensorResource.find
   * @param {string} deviceId - Device Id owning the sensor
   * @param {string} sensorId - Sensor instance Id
   * @param {string} [resourceId] - OMA Resource key
   * @returns {Promise<object[] | null>} resources
   */
  SensorResource.find = async (deviceId, sensorId, resourceId) => {
    let result = null;
    try {
      logger.publish(4, `${collectionName}`, 'find:req', { deviceId, sensorId, resourceId });
      if (resourceId) {
        const key = setCacheKey(deviceId, sensorId, resourceId);
        const cachedResource = await SensorResource.get(key);
        if (cachedResource) {
          result = JSON.parse(cachedResource);
        }
      } else {
        const filter = { match: setCacheKey(deviceId, sensorId) };
        const cachedResources = await SensorResource.getAll(filter);
        result = {};
        if (cachedResources) {
          cachedResources.forEach(resource => {
            const [resourceKey] = Object.keys(resource);
            const [resourceValue] = Object.values(resource);
            if (!resourceKey) return;
            // eslint-disable-next-line security/detect-object-injection
            result[resourceKey] = resourceValue;
          });
        }
      }
      logger.publish(3, `${collectionName}`, 'find:res', { result });
      return result;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'find:err', error);
      return result;
    }
  };

  /**
   * Create or update SensorResource instance(s) into the cache memory
   * @method module:SensorResource.save
   * @param {string} deviceId - Device Id owning the sensor
   * @param {string} sensorId - Sensor Id owning the resource
   * @param {object} resources - Resource(s) instance to save
   * @param {number} [ttl] - Expire delay
   * @returns {Promise<object[] | null>} resources
   */
  SensorResource.save = async (deviceId, sensorId, resources, ttl) => {
    try {
      const resourceKeys = Object.keys(resources);
      logger.publish(4, `${collectionName}`, 'save:req', {
        deviceId,
        sensorId,
        resourceKeys,
      });
      const result = {};
      await Promise.all(
        resourceKeys.map(async resourceKey => {
          const key = setCacheKey(deviceId, sensorId, resourceKey);
          // todo : sqve as buffer ?
          // eslint-disable-next-line security/detect-object-injection
          const resource = JSON.stringify({ [resourceKey]: resources[resourceKey] });
          if (ttl && ttl !== null) {
            await SensorResource.set(key, resource, ttl);
          } else {
            await SensorResource.set(key, resource);
          }
          // eslint-disable-next-line security/detect-object-injection
          result[resourceKey] = resources[resourceKey];
          return resource;
        }),
      );
      logger.publish(3, `${collectionName}`, 'save:res', { result });
      return result;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'save:err', error);
      return null;
    }
  };

  /**
   * Delete a SensorResource instance(s) stored in cache
   * @method module:SensorResource.remove
   * @param {string} deviceId - Device Id owning the sensor
   * @param {string} sensorId - Sensor instance Id
   * @param {string} [resourceId] - OMA Resource key
   * @returns {Promise<boolean>} success
   */
  SensorResource.remove = async (deviceId, sensorId, resourceId) => {
    try {
      if (resourceId) {
        const key = setCacheKey(deviceId, sensorId, resourceId);
        await SensorResource.delete(key);
      } else {
        const filter = { match: setCacheKey(deviceId, sensorId) };
        await SensorResource.deleteAll(filter);
      }
      logger.publish(4, `${collectionName}`, 'remove:res', { deviceId, sensorId, resourceId });
      return true;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'remove:err', error);
      return false;
    }
  };

  /**
   * Set TTL for a sensor stored in cache
   * @method module:SensorResource.expireCache
   * @param {string} deviceId - Device Id owning the sensor
   * @param {string} sensorId - Sensor instance Id
   * @param {string} resourceId - OMA Resource key
   * @param {number} [ttl] - Sensor instance Id
   * @returns {Promise<boolean>} success
   */
  SensorResource.expireCache = async (deviceId, sensorId, resourceId, ttl = 1) => {
    const key = setCacheKey(deviceId, sensorId, resourceId);
    await SensorResource.expire(key, ttl);
    logger.publish(4, `${collectionName}`, 'expireCache:res', { key, ttl });
    return true;
  };

  /**
   * Optional error callback
   * @callback module:SensorResource~errorCallback
   * @param {error} ErrorObject
   */

  /**
   * Optional result callback
   * @callback module:SensorResource~resultCallback
   * @param {error} ErrorObject
   * @param {string} result
   */

  /**
   * Get SensorResource by key
   *
   * Use callback or promise
   *
   * @method module:SensorResource.get
   * @param {string} key
   * @param {resultCallback} [cb] - Optional callback
   * @promise result
   */

  /**
   * Set SensorResource by key, with optional TTL
   *
   * Use callback or promise
   *
   * @method module:SensorResource.set
   * @param {string} key
   * @param {string} value
   * @param {number} [ttl]
   * @param {ErrorCallback} [cb] - Optional callback
   * @promise undefined
   */

  /**
   * Delete SensorResource by key
   *
   * Use callback or promise
   *
   * @method module:SensorResource.delete
   * @param {string} key
   * @param {ErrorCallback} [cb] - Optional callback
   * @promise undefined
   */

  /**
   * Set the TTL (time to live) in ms (milliseconds) for a given key
   *
   * Use callback or promise
   *
   * @method module:SensorResource.expire
   * @param {string} key
   * @param {number} [ttl]
   * @param {ErrorCallback} [cb] - Optional callback
   * @promise undefined
   */

  /**
   * Get all SensorResource keys
   *
   * Use callback or promise
   *
   * @method module:SensorResource.keys
   * @param {object} [filter]
   * @param {object} filter.match Glob string used to filter returned keys (i.e. userid.*)
   * @param {function} [cb]
   * @returns {string[]}
   */

  /**
   * Iterate over all SensorResource keys
   *
   * Use callback or promise
   *
   * @method module:SensorResource.iterateKeys
   * @param {object} [filter]
   * @param {object} filter.match Glob string used to filter returned keys (i.e. userid.*)
   * @returns {AsyncIterator} An Object implementing next(cb) -> Promise function that can be used to iterate all keys.
   */

  SensorResource.disableRemoteMethodByName('get');
  SensorResource.disableRemoteMethodByName('set');
  SensorResource.disableRemoteMethodByName('delete');
  SensorResource.disableRemoteMethodByName('keys');
  SensorResource.disableRemoteMethodByName('iterateKeys');
  SensorResource.disableRemoteMethodByName('ttl');
  SensorResource.disableRemoteMethodByName('expire');
};
