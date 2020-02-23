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

  Client.disableRemoteMethodByName('get');
  Client.disableRemoteMethodByName('set');
  Client.disableRemoteMethodByName('keys');
  Client.disableRemoteMethodByName('iterateKeys');
  Client.disableRemoteMethodByName('ttl');
  Client.disableRemoteMethodByName('expire');
};
