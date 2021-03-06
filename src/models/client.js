/* Copyright 2020 Edouard Maleix, read LICENSE */

/* eslint-disable no-restricted-syntax */
import logger from '../services/logger';
import utils from '../lib/utils';

const collectionName = 'Client';

/**
 * Called when a remote method tries to access Client Model / instance
 * @method module:Client~onBeforeRemote
 * @param {object} ctx - Express context
 * @param {object} [Model] - Response
 * @returns {Promise<object>} context
 */
const onBeforeRemote = async (ctx) => {
  if (ctx.method.name === 'find' || ctx.method.name === 'remove') {
    // console.log('onBeforeRemote', ctx.method.name);
    const options = ctx.options || {};
    const isAdmin = options.currentUser.roles.includes('admin');
    const isMachine = options.currentUser.roles.includes('machine');
    if (!isAdmin && !isMachine) {
      throw utils.buildError(401, 'UNAUTHORIZED', 'Wrong user');
    }
  }
  return ctx;
};

/**
 * Find clients in the cache
 * @async
 * @method module:Client~getAll
 * @param {object} Model - Client model
 * @param {object} [filter] - Client filter
 * @returns {Promise<object[]>} clients
 */
const getAll = async (Model, filter) => {
  const clients = [];
  logger.publish(4, `${collectionName}`, 'getAll:req', { filter });
  for await (const key of utils.cacheIterator(Model, filter)) {
    const client = JSON.parse(await Model.get(key));
    clients.push(client);
  }
  logger.publish(3, `${collectionName}`, 'getAll:res', clients);
  return clients;
};

/**
 * Delete clients stored in cache
 * @async
 * @method module:Client~deleteAll
 * @param {object} Model - Client model
 * @param {object} [filter] - Client filter
 * @returns {Promise<string[]>} clients keys
 */
const deleteAll = async (Model, filter) => {
  const clients = [];
  logger.publish(4, `${collectionName}`, 'deleteAll:req', { filter });
  for await (const key of utils.cacheIterator(Model, filter)) {
    await Model.delete(key);
    clients.push(key);
  }
  logger.publish(3, `${collectionName}`, 'deleteAll:res', clients);
  return clients;
};

/**
 * @module Client
 * @property {string} id Client ID
 * @property {string} ip Client IP
 * @property {string} user Username attribute ( once client authenthified )
 * @property {boolean} status Client status
 * @property {string} model Aloes model ( Application, Device, ... )
 * @property {string} [type] Client type ( MQTT, WS , ... )
 * @property {string} [devEui] device DevEui
 * @property {string} [appEui] application AppEui
 */

module.exports = function (Client) {
  Client.once('dataSourceAttached', (Model) => {
    /**
     * Find clients in the cache
     * @async
     * @method module:Client.find
     * @param {object} filter - Client filter
     * @returns {Promise<object[]>} clients
     */
    Model.find = async (filter) => getAll(Model, filter);

    /**
     * Find clients in the cache
     * @async
     * @method module:Client.remove
     * @param {object} filter - Client filter
     * @returns {Promise<string[]>} clients keys
     */
    Model.remove = async (filter) => deleteAll(Model, filter);
  });

  /**
   * Event reporting that a Client method is requested
   * @event before_*
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @returns {function} Client~onBeforeRemote
   */
  Client.beforeRemote('**', onBeforeRemote);

  Client.afterRemoteError('*', (ctx, next) => {
    logger.publish(2, `${collectionName}`, `after ${ctx.methodString}:err`, ctx.error);
    next();
  });

  /**
   * Event reporting that application stopped
   *
   * Trigger Client stopping routine
   *
   * @event stopped
   */
  Client.on('stopped', async () => {
    if (!utils.isMasterProcess(process.env)) return false;
    logger.publish(3, `${collectionName}`, 'on-stop:res', '');
    return Client.deleteAll();
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
   * @returns {Promise<object | null>}
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
   * @param {errorCallback} [cb] - Optional callback
   * @promise undefined
   * @returns {Promise<undefined>}
   */

  /**
   * Delete Client by key
   *
   * Use callback or promise
   *
   * @method module:Client.delete
   * @param {string} key
   * @param {errorCallback} [cb] - Optional callback
   * @promise undefined
   * @returns {Promise<undefined>}
   */

  /**
   * Set the TTL (time to live) in ms (milliseconds) for a given key
   *
   * Use callback or promise
   *
   * @method module:Client.expire
   * @param {string} key
   * @param {number} [ttl]
   * @param {errorCallback} [cb] - Optional callback
   * @promise undefined
   * @returns {Promise<undefined>}
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
   * @returns {Promise<string[]>}
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
  Client.disableRemoteMethodByName('delete');
  Client.disableRemoteMethodByName('keys');
  Client.disableRemoteMethodByName('iterateKeys');
  Client.disableRemoteMethodByName('ttl');
  Client.disableRemoteMethodByName('expire');
};
