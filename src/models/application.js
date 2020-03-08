/* Copyright 2020 Edouard Maleix, read LICENSE */

import { appPatternDetector, publish } from 'iot-agent';
import {
  collectionName,
  onBeforeDelete,
  onAfterSave,
  onBeforeSave,
  onBeforeRemote,
  parseMessage,
} from '../lib/models/application';
import logger from '../services/logger';
import utils from '../lib/utils';

/**
 * @module Application
 * @property {String} id  Database generated ID.
 * @property {String} name Unique name defined by user required.
 * @property {String} description Define Application purpose.
 * @property {Array} collaborators A list of users ids who have permissions to use this application
 * @property {Array} clients A list of client ids authentified as this application
 */

module.exports = Application => {
  Application.validatesUniquenessOf('appEui');

  Application.validatesPresenceOf('ownerId');

  Application.validatesUniquenessOf('name', { scopedTo: ['ownerId'] });

  /**
   * Format packet and send it via MQTT broker
   * @async
   * @method module:Application.publish
   * @param {object} application - Application instance
   * @param {string} method - Publish method
   * @param {object} [client] - MQTT client target
   * @fires Server.publish
   * @returns {Promise<object | null>} application
   */
  Application.publish = async (application, method, client) => {
    if (!application || !application.ownerId) {
      throw new Error('Wrong application instance');
    }
    const packet = publish({
      userId: application.ownerId,
      collection: collectionName,
      data: application,
      modelId: application.id,
      method: method || application.method,
      pattern: 'aloesClient',
    });
    if (packet && packet.topic && packet.payload) {
      logger.publish(4, `${collectionName}`, 'publish:res', {
        topic: packet.topic,
      });
      if (client && client.id) {
        // publish to client
        return null;
      }
      if (application.status) {
        const topic = `${application.id}/${collectionName}/${method}`;
        Application.app.emit('publish', topic, packet.payload, false, 1);
      }
      Application.app.emit('publish', packet.topic, packet.payload, false, 1);
      return application;
    }
    throw new Error('Invalid MQTT Packet encoding');
  };

  /**
   * Reset keys for this application instance
   * @method module:Application.prototype.resetKeys
   * @returns {Promise<object>} this
   */
  Application.prototype.resetKeys = async function() {
    const attributes = {
      clientKey: utils.generateKey('client'),
      apiKey: utils.generateKey('apiKey'),
      // restApiKey: utils.generateKey('restApi'),
      // javaScriptKey: utils.generateKey('javaScript'),
      // windowsKey: utils.generateKey('windows'),
      // masterKey: utils.generateKey('master'),
    };
    await this.updateAttributes(attributes);
    return this;
  };

  /**
   * Create new keys, and update Application instance
   * @method module:Application.refreshToken
   * @param {string} appId - Application instance id
   * @param {string} ownerId - Application owner id
   * @returns {Promise<function>} application.updateAttributes
   */
  Application.refreshToken = async (appId, ownerId) => {
    logger.publish(4, `${collectionName}`, 'refreshToken:req', appId);
    const application = await Application.findById(appId);
    if (ownerId !== application.ownerId.toString()) {
      const error = utils.buildError(401, 'INVALID_OWNER', "User doesn't own this device");
      throw error;
    }
    if (application && application !== null) {
      // await application.resetKeys()
      const attributes = {
        clientKey: utils.generateKey('client'),
        apiKey: utils.generateKey('apiKey'),
        // restApiKey: utils.generateKey('restApi'),
        // javaScriptKey: utils.generateKey('javaScript'),
        // windowsKey: utils.generateKey('windows'),
        // masterKey: utils.generateKey('master'),
      };
      await application.updateAttributes(attributes);
      return application;
    }
    const error = utils.buildError(404, 'APP_NOT_FOUND', "The application requested doesn't exist");
    throw error;
  };

  /**
   * Dispatch incoming MQTT packet
   * @method module:Application.onPublish
   * @param {object} packet - MQTT bridge packet
   * @param {object} client - MQTT client
   * @param {object} pattern - Pattern detected by Iot-Agent
   * @returns {Promise<function>} Application~parseMessage
   */
  Application.onPublish = async (packet, client, pattern) => {
    logger.publish(4, `${collectionName}`, 'onPublish:req', pattern);
    if (!pattern.name || !pattern.params || !pattern.params.method || !pattern.params.collection) {
      throw new Error('Invalid inputs');
    }

    return parseMessage(Application.app, packet, pattern, client);
  };

  /**
   * Detect application known pattern and load the application instance
   * @method module:Application~detector
   * @param {object} packet - MQTT packet
   * @param {object} client - MQTT client
   * @returns {Promise<object | null>} pattern
   */
  Application.detector = async (packet, client) => {
    // const pattern = {name: 'empty', params: null};
    if (packet.topic.split('/')[0] === '$SYS') return null;
    logger.publish(5, collectionName, 'detector:req', packet.topic);
    const filter = { where: {} };
    // if (client.appEui) {
    //   filter.where.appEui = client.appEui;
    // } else
    if (client.appId) {
      filter.where.id = client.appId;
    } else {
      throw new Error('Invalid application client');
    }
    const application = await Application.findOne(filter);
    if (!application || application === null) {
      throw new Error('No application found');
    }
    const pattern = appPatternDetector(packet, application);
    logger.publish(3, collectionName, 'detector:res', pattern);
    return pattern;
  };

  /**
   * Update application status from MQTT conection status
   * @method module:Application.updateStatus
   * @param {object} client - MQTT client
   * @param {boolean} status - MQTT conection status
   * @returns {Promise<function>} application.updateAttributes
   */
  Application.updateStatus = async (client, status) => {
    // if (!client || !client.id || !client.appId) {
    //   throw new Error('Invalid client');
    // }
    logger.publish(4, collectionName, 'updateStatus:req', status);
    const Client = Application.app.models.Client;
    const application = await Application.findById(client.user);
    if (!application) {
      return null;
    }
    let frameCounter = application.frameCounter;
    // let ttl;
    client.status = status;
    const clients = application.clients || [];
    const index = clients.indexOf(client.id);
    if (status) {
      if (index === -1) {
        clients.push(client.id);
      }
      const ttl = 7 * 24 * 60 * 60 * 1000;
      if (clients.length === 1) {
        frameCounter = 1;
      }
      await Client.set(client.id, JSON.stringify(client), ttl);
    } else {
      // ttl = 1 * 24 * 60 * 60 * 1000;
      if (index > -1) {
        clients.splice(index, 1);
      }
      if (clients.length > 1) {
        status = true;
      } else {
        frameCounter = 0;
        const Device = Application.app.models.Device;
        const devices = await Device.find({
          where: { and: [{ appIds: { inq: [client.appId] } }, { status: true }] },
        });
        await Promise.all(
          devices.map(async device =>
            device.updateAttributes({ frameCounter, status }).catch(e => e),
          ),
        );
      }
      await Client.delete(client.id);
    }

    logger.publish(4, collectionName, 'updateStatus:res', client);
    return application.updateAttributes({ frameCounter, status, clients }).catch(e => e);
    // return client;
  };

  /**
   * Endpoint for application authentification with APIKey
   *
   * @method module:Application.authenticate
   * @param {any} applicationId
   * @param {string} key
   * @returns {Promise<object>} matched The matching application and key; one of:
   * - clientKey
   * - apiKey
   * - javaScriptKey
   * - restApiKey
   * - windowsKey
   * - masterKey
   */
  Application.authenticate = async (appId, key) => {
    const application = await Application.findById(appId);
    // if (!application || !application.id) {
    //   throw utils.buildError(404, 'APPLICATION_NOTFOUND', 'Wrong application');
    // }

    let result = null;
    const keyNames = [
      'clientKey',
      'apiKey',
      // 'javaScriptKey',
      // 'restApiKey',
      // 'windowsKey',
      // 'masterKey',
    ];
    keyNames.forEach(k => {
      // eslint-disable-next-line security/detect-object-injection
      if (application[k] && application[k] === key) {
        result = {
          application,
          keyType: k,
        };
      }
    });
    if (!result || !result.application || !result.keyType) {
      throw utils.buildError(403, 'UNAUTHORIZED', 'Wrong key used');
    }
    return result;
  };

  /**
   * Endpoint to get resources attached to an application
   * @method module:Application.getState
   * @param {string} applicationId
   * @returns {Promise<object>} application
   */
  Application.getState = async appId => {
    if (!appId) throw new Error('missing application.id');
    logger.publish(4, `${collectionName}`, 'getState:req', { appId });
    const application = await Application.findById(appId);
    if (application && application.id) {
      let devices = await Application.app.models.Device.find({
        where: {
          and: [{ ownerId: application.ownerId }, { appIds: { inq: [application.id] } }],
        },
      });
      if (devices && devices.length > 0) {
        devices = JSON.parse(JSON.stringify(devices));
        const promises = devices.map(Application.app.models.SensorResource.includeCache);
        application.devices = await Promise.all(promises);
      } else {
        application.devices = [];
      }
      return application;
    }
    const error = utils.buildError(404, 'APPLICATION_NOTFOUND', 'Wrong application');
    throw error;
  };

  /**
   * Event reporting that an application client connection status has changed.
   * @event client
   * @param {object} message - Parsed MQTT message.
   * @property {object} message.client - MQTT client
   * @property {boolean} message.status - MQTT client status.
   * @returns {Promise<function>} Application.updateStatus
   */
  Application.on('client', async message => {
    logger.publish(4, `${collectionName}`, 'on-client:req', Object.keys(message));
    // if (!message || message === null) throw new Error('Message empty');
    const { client, status } = message;
    if (!client || !client.user) {
      return;
      // throw new Error('Message missing properties');
    }
    await Application.updateStatus(client, status);
  });

  /**
   * Event reporting that an application client sent a message.
   * @event publish
   * @param {object} message - Parsed MQTT message.
   * @property {object} message.packet - MQTT packet.
   * @property {object} message.pattern - Pattern detected
   * @property {object} message.client - MQTT client
   * @returns {Promise<function>} Application.onPublish
   */
  Application.on('publish', async message => {
    try {
      // if (!message || message === null) throw new Error('Message empty');
      const { client, packet, pattern } = message;
      logger.publish(4, collectionName, 'on:publish:req', pattern.name);
      if (!packet || !pattern) throw new Error('Message missing properties');
      await Application.onPublish(packet, client, pattern);
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'on-publish:err', error);
    }
  });

  /**
   * Event reporting that application stopped
   *
   * Trigger Application stopping routine
   *
   * @event stopped
   */
  Application.on('stopped', async () => {
    try {
      if (utils.isMasterProcess(process.env)) {
        await Application.updateAll({ status: true }, { status: false, clients: [] });
        logger.publish(3, `${collectionName}`, 'on-stop:res', '');
      }
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'on-stop:err', error);
    }
  });

  /**
   * Event reporting that an application instance will be created or updated.
   * @event before_save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Application instance
   * @returns {Promise<function>} Application~onBeforeSave
   */
  Application.observe('before save', onBeforeSave);

  /**
   * Event reporting that a device instance has been created or updated.
   * @event after_save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Application instance
   * @returns {Promise<function>} Application~onAfterSave
   */
  Application.observe('after save', onAfterSave);

  /**
   * Event reporting that an application instance will be deleted.
   * @event before_delete
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.where.id - Application instance
   * @returns {Promise<function>} Application~onBeforeDelete
   */
  Application.observe('before delete', onBeforeDelete);

  /**
   * Event reporting that an Application instance / collection is requested
   * @event before_*
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @returns {Promise<function>} Application~onBeforeRemote
   */
  Application.beforeRemote('**', onBeforeRemote);

  Application.afterRemoteError('*', (ctx, next) => {
    logger.publish(4, `${collectionName}`, `after ${ctx.methodString}:err`, ctx.error);
    // publish on collectionName/ERROR
    next();
  });

  /**
   * Find applications
   * @method module:Application.find
   * @param {object} filter
   * @returns {Promise<object>}
   */

  /**
   * Returns applications length
   * @method module:Application.count
   * @param {object} where
   * @returns {Promise<number>}
   */

  /**
   * Find application by id
   * @method module:Application.findById
   * @param {any} id
   * @param {object} filter
   * @returns {Promise<object>}
   */

  /**
   * Create application
   * @method module:Application.create
   * @param {object} application
   * @returns {Promise<object>}
   */

  /**
   * Update application by id
   * @method module:Application.updateById
   * @param {any} id
   * @param {object} filter
   * @returns {Promise<object>}
   */

  /**
   * Delete application by id
   * @method module:Application.deleteById
   * @param {any} id
   * @param {object} filter
   * @returns {Promise<object>}
   */

  Application.disableRemoteMethodByName('count');
  Application.disableRemoteMethodByName('upsertWithWhere');
  Application.disableRemoteMethodByName('replaceOrCreate');
  Application.disableRemoteMethodByName('createChangeStream');

  Application.disableRemoteMethodByName('prototype.__link__collaborators');
  Application.disableRemoteMethodByName('prototype.__unlink__collaborators');
};
