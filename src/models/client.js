/* eslint-disable no-restricted-syntax */
import logger from '../services/logger';

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

  Client.disableRemoteMethodByName('count');
  Client.disableRemoteMethodByName('upsertWithWhere');
  Client.disableRemoteMethodByName('replaceOrCreate');
  Client.disableRemoteMethodByName('createChangeStream');

  /**
   * Iterate over each Client keys found in cache
   * @method module:Client.cacheIterator
   * @param {object} [filter] - Client filter
   * @returns {string} key - Cached key
   */
  Client.cacheIterator = async function*(filter) {
    let iterator;
    if (filter && filter.match) {
      iterator = Client.iterateKeys(filter);
    } else {
      iterator = Client.iterateKeys();
    }
    try {
      while (true) {
        const key = iterator.next();
        //  const key = await iterator.next();
        if (!key) {
          return;
        }
        yield key;
      }
    } finally {
      logger.publish(4, `${collectionName}`, 'cacheIterator:res', 'over');
    }
  };

  /**
   * Delete clients stored in cache
   * @method module:Client.deleteAll
   * @returns {array} clients - Cached clients keys
   */
  Client.deleteAll = async () => {
    try {
      const clients = [];
      logger.publish(4, `${collectionName}`, 'deleteAll:req', '');
      for await (const key of Client.cacheIterator()) {
        if (key && key !== null) {
          clients.push(key);
          await Client.delete(key);
        }
      }
      return clients;
    } catch (error) {
      return error;
    }
  };

  Client.on('stopped', async () => {
    try {
      await Client.deleteAll();
      return true;
    } catch (error) {
      return error;
    }
  });
};
