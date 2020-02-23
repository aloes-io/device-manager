/* Copyright 2019 Edouard Maleix, read LICENSE */

/* eslint-disable no-restricted-syntax */
import logger from '../services/logger';
import utils from '../services/utils';

/**
 * @module Client
 * @property {String} id Client ID
 * @property {String} [name] Client name
 * @property {String} [user] Username attribute ( once client authenthified )
 * @property {String} [type] Client type ( MQTT, ... )
 * @property {boolean} status Client status
 * @property {String} [model] Aloes model ( Application, Device, ... )
 */

module.exports = function(Client) {
  const collectionName = 'Client';

  /**
   * Iterate over each Client keys found in cache
   * @method module:Client.cacheIterator
   * @param {object} [filter] - Client filter
   * @returns {string} key - Cached key
   */
  Client.cacheIterator = async function*(filter) {
    const iterator = Client.iterateKeys(filter);
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
   * Find clients in the cache
   * @method module:Client.getAll
   * @param {object} [filter] - Client filter
   * @returns {array} schedulers - Cached clients
   */
  Client.getAll = async filter => {
    logger.publish(4, `${collectionName}`, 'getAll:req', { filter });
    const clients = [];
    for await (const key of Client.cacheIterator(filter)) {
      try {
        const client = JSON.parse(await Client.get(key));
        clients.push(client);
      } catch (e) {
        // empty
      }
    }
    return clients;
  };

  /**
   * Delete clients stored in cache
   * @method module:Client.deleteAll
   * @param {object} [filter] - Client filter
   * @returns {array} clients - Cached clients keys
   */
  Client.deleteAll = async filter => {
    const clients = [];
    logger.publish(4, `${collectionName}`, 'deleteAll:req', { filter });
    for await (const key of Client.cacheIterator()) {
      if (key && key !== null) {
        await Client.delete(key);
        clients.push(key);
      }
    }
    return clients;
  };

  /**
   * Event reporting that application stopped
   *
   * Trigger Client stopping routine
   *
   * @event stopped
   */
  Client.on('stopped', async () => {
    try {
      if (!utils.isMasterProcess(process.env)) return false;
      logger.publish(3, `${collectionName}`, 'on-stop:res', '');
      await Client.deleteAll();
      return true;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'on-stop:err', error);
      return false;
    }
  });

  /**
   * Optional error callback
   * @callback module:Client~errorCallback
   * @param {error} ErrorObject
   */

  /**
   * Optional result callback
   * @callback module:Client~resultCallback
   * @param {error} ErrorObject
   * @param {string} result
   */

  /**
   * Get client by key
   *
   * Use callback or promise
   *
   * @method module:Client.get
   * @param {string} key
   * @param {resultCallback} [cb] - Optional callback
   * @promise result
   */

  /**
   * Set client by key, with optional TTL
   *
   * Use callback or promise
   *
   * @method module:Client.set
   * @param {string} key
   * @param {string} value
   * @param {number} [ttl]
   * @param {ErrorCallback} [cb] - Optional callback
   * @promise undefined
   */

  /**
   * Set the TTL (time to live) in ms (milliseconds) for a given key
   *
   * Use callback or promise
   *
   * @method module:Client.expire
   * @param {string} key
   * @param {number} [ttl]
   * @param {ErrorCallback} [cb] - Optional callback
   * @promise undefined
   */

  /**
   * Get all client keys
   *
   * Use callback or promise
   *
   * @method module:Client.keys
   * @param {object} [filter]
   * @param {object} filter.match Glob string used to filter returned keys (i.e. userid.*)
   * @param {function} [cb]
   * @returns {string[]}
   */

  /**
   * Iterate over all client keys
   *
   * Use callback or promise
   *
   * @method module:Client.iterateKeys
   * @param {object} [filter]
   * @param {object} filter.match Glob string used to filter returned keys (i.e. userid.*)
   * @returns {AsyncIterator} An Object implementing next(cb) -> Promise function that can be used to iterate all keys.
   */

  Client.disableRemoteMethodByName('get');
  Client.disableRemoteMethodByName('set');
  Client.disableRemoteMethodByName('keys');
  Client.disableRemoteMethodByName('iterateKeys');
  Client.disableRemoteMethodByName('ttl');
  Client.disableRemoteMethodByName('expire');
};
