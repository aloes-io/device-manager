/* Copyright 2019 Edouard Maleix, read LICENSE */

import { appPatternDetector, publish } from 'iot-agent';
import logger from '../services/logger';
import utils from '../services/utils';

/**
 * @module Application
 * @property {String} id  Database generated ID.
 * @property {String} name Unique name defined by user required.
 * @property {String} description Define Application purpose.
 * @property {Array} collaborators A list of users ids who have permissions to use this application
 * @property {Array} clients A list of client ids authentified as this application
 */

const collectionName = 'Application';

const filteredProperties = ['children', 'size', 'show', 'group', 'success', 'error'];

/**
 * Validate instance before creation
 * @method module:Application~onBeforeSave
 * @param {object} ctx - Loopback context
 * @returns {object} ctx
 */
const onBeforeSave = async ctx => {
  try {
    if (ctx.options && ctx.options.skipPropertyFilter) return ctx;

    if (ctx.instance) {
      logger.publish(4, `${collectionName}`, 'onBeforeSave:req', ctx.instance);
      const promises = await filteredProperties.map(async prop =>
        ctx.instance.unsetAttribute(prop),
      );
      await Promise.all(promises);
      logger.publish(4, collectionName, 'onBeforeSave:res', ctx.instance);
      return ctx;
    }
    if (ctx.data) {
      logger.publish(4, `${collectionName}`, 'onBeforePartialSave:req', ctx.data);
      // eslint-disable-next-line security/detect-object-injection
      filteredProperties.forEach(p => delete ctx.data[p]);
      ctx.hookState.updateData = ctx.data;
      return ctx;
    }
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onBeforeSave:err', error);
    throw error;
  }
};

/**
 * Keys creation helper - update application attributes
 * @method module:Application~createKeys
 * @param {object} application - Application instance
 * @returns {object} application
 */
const createKeys = async application => {
  try {
    const attributes = {};
    let hasChanged = false;
    if (!application.clientKey) {
      attributes.clientKey = utils.generateKey('client');
      hasChanged = true;
    }
    if (!application.apiKey) {
      attributes.apiKey = utils.generateKey('apiKey');
      hasChanged = true;
    }
    if (hasChanged) {
      await application.updateAttributes(attributes);
    }
    return application;
  } catch (error) {
    logger.publish(3, `${collectionName}`, 'createKeys:err', error);
    throw error;
  }
};

/**
 * Init application dependencies ( token )
 * @method module:Application~createProps
 * @param {object} app - Loopback app
 * @param {object} instance - Application instance
 * @returns {function} Application.publish
 */
const createProps = async (app, instance) => {
  try {
    instance = await createKeys(instance);
    // if (!application.apiKey) {
    //   await instance.destroy()
    //   throw new Error('Application failed to be created');
    // }
    return app.models.Application.publish(instance, 'POST');
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'createProps:err', error);
    throw error;
  }
};

/**
 * Update application depencies
 * @method module:Application~updateProps
 * @param {object} app - Loopback app
 * @param {object} instance - Application instance
 * @returns {function} Application.publish
 */
const updateProps = async (app, instance) => {
  try {
    instance = await createKeys(instance);
    return app.models.Application.publish(instance, 'PUT');
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'updateProps:err', error);
    throw error;
  }
};

/**
 * Create relations on instance creation
 * @method module:Application~onAfterSave
 * @param {object} ctx - Loopback context
 * @returns {object} ctx
 */
const onAfterSave = async ctx => {
  try {
    if (ctx.hookState.updateData) {
      logger.publish(3, `${collectionName}`, 'afterSave:req', ctx.hookState.updateData);
      const updatedProps = Object.keys(ctx.hookState.updateData);
      if (updatedProps.some(prop => prop === 'status')) {
        // if (!ctx.instance) console.log('AFTER APP SAVE', ctx.where);
        // todo : if (ctx.where) update all ctx.where
        if (ctx.instance && ctx.instance.id) await ctx.Model.publish(ctx.instance, 'HEAD');
      }
    } else if (ctx.instance && ctx.Model) {
      logger.publish(3, `${collectionName}`, 'afterSave:req', ctx.instance);
      if (ctx.isNewInstance) {
        await createProps(ctx.Model.app, ctx.instance);
      } else {
        await updateProps(ctx.Model.app, ctx.instance);
      }
    }
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'afterSave:err', error);
    throw error;
  }
};

/**
 * Remove application dependencies
 * @method module:Application~deleteProps
 * @param {object} app - Loopback app
 * @param {object} instance
 * @returns {function} Application.publish
 */
const deleteProps = async (app, instance) => {
  try {
    if (!instance || !instance.id || !instance.ownerId) {
      // throw utils.buildError(403, 'INVALID_DEVICE', 'Invalid application instance');
      return null;
    }
    logger.publish(4, `${collectionName}`, 'deleteProps:req', instance);
    // const Device = app.models.Device;
    // const devices = await Device.find({ where: { appEui: instance.appEui } });
    // if (devices && devices.length > 0) {
    //   const promises = await devices.map(async device => device.delete());
    //   await Promise.all(promises);
    // }
    await app.models.Application.publish(instance, 'DELETE');
    return instance;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'deleteProps:err', error);
    return null;
  }
};

/**
 * Delete relations on instance(s) deletetion
 * @method module:Application~onBeforeDelete
 * @param {object} ctx - Loopback context
 * @returns {object} ctx
 */
const onBeforeDelete = async ctx => {
  try {
    logger.publish(4, `${collectionName}`, 'onBeforeDelete:req', ctx.where);
    if (ctx.where && ctx.where.id && !ctx.where.id.inq) {
      const instance = await ctx.Model.findById(ctx.where.id);
      await deleteProps(ctx.Model.app, instance);
    } else {
      const filter = { where: ctx.where };
      const applications = await ctx.Model.find(filter);
      if (applications && applications.length > 0) {
        await Promise.all(applications.map(async instance => deleteProps(ctx.Model.app, instance)));
      }
    }
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onBeforeDelete:err', error);
    throw error;
  }
};

const onBeforeRemote = async ctx => {
  try {
    if (
      ctx.method.name.indexOf('find') !== -1 ||
      ctx.method.name.indexOf('__get') !== -1 ||
      ctx.method.name === 'get'
      // count
      // ctx.method.name.indexOf('get') !== -1
    ) {
      const options = ctx.args ? ctx.args.options : {};
      if (!options || !options.currentUser) {
        throw utils.buildError(401, 'UNAUTHORIZED', 'Requires authentification');
      }
      const isAdmin = options.currentUser.roles.includes('admin');
      if (ctx.req.query && ctx.req.query.filter) {
        if (!isAdmin) {
          if (typeof ctx.req.query.filter === 'string') {
            ctx.req.query.filter = JSON.parse(ctx.req.query.filter);
          }
          if (!ctx.req.query.filter.where) ctx.req.query.filter.where = {};
          ctx.req.query.filter.where.ownerId = options.currentUser.id.toString();
        }
      }
      if (ctx.req.params) {
        if (!isAdmin) {
          ctx.req.params.ownerId = options.currentUser.id.toString();
        }
      }
    } else if (ctx.method.name === 'onPublish') {
      const options = ctx.args ? ctx.args.options : {};
      if (!options || !options.currentUser) {
        throw utils.buildError(401, 'UNAUTHORIZED', 'Requires authentification');
      }
      // console.log('before remote', ctx.method.name, options.currentUser, ctx.args.client);
      const isAdmin = options.currentUser.roles.includes('admin');
      if (!ctx.args.client) ctx.args.client = {};
      // ctx.args.client.user = options.currentUser.id.toString();
      if (!isAdmin) {
        ctx.args.client.user = options.currentUser.id.toString();
        if (options.currentUser.appEui) {
          ctx.args.client.appEui = options.currentUser.appEui;
        }
      }
    } else if (ctx.method.name === 'updateStatus') {
      const options = ctx.args ? ctx.args.options : {};
      if (!options || !options.currentUser) {
        throw utils.buildError(401, 'UNAUTHORIZED', 'Requires authentification');
      }
      // console.log('before remote', ctx.method.name, options.currentUser, ctx.args.client);
      const isAdmin = options.currentUser.roles.includes('admin');
      if (!ctx.args.client) ctx.args.client = {};
      if (!isAdmin) {
        ctx.args.client.user = options.currentUser.id.toString();
        if (options.currentUser.appEui) {
          ctx.args.client.appEui = options.currentUser.appEui;
        }
      }
    } else if (ctx.method.name === 'getState' || ctx.method.name === 'getFullState') {
      const options = ctx.args ? ctx.args.options : {};
      if (!options || !options.currentUser) {
        throw utils.buildError(401, 'UNAUTHORIZED', 'Requires authentification');
      }
      // console.log('before remote', ctx.method.name, options.currentUser, ctx.args.deviceId);
      const isAdmin = options.currentUser.roles.includes('admin');
      if (!isAdmin) {
        if (options.currentUser.appEui) {
          if (options.currentUser.id.toString() !== ctx.args.appId.toString()) {
            const error = utils.buildError(
              401,
              'INVALID_USER',
              'Only application itself can trigger this endpoint',
            );
            throw error;
          }
        }
      }
    }
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onBeforeRemote:err', error);
    throw error;
  }
};

/**
 * Find properties and dispatch to the right function
 *
 * Adding device and sensor context to raw incoming data
 *
 * @method module:Application~parseMessage
 * @param {object} app - Loopback app
 * @param {object} packet - MQTT packet
 * @param {object} pattern - Pattern detected by IotAgent
 * @param {object} client - MQTT client
 * @fires Device.publish
 * @fires Sensor.publish
 * @returns {object} device
 */
const parseMessage = async (app, packet, pattern, client) => {
  try {
    const Application = app.models.Application;
    const Device = app.models.Device;
    const Sensor = app.models.Sensor;
    const attributes = JSON.parse(packet.payload);
    let foundInstance = null;
    let instanceId;
    if (pattern.params.modelId) {
      instanceId = pattern.params.modelId;
    }

    // console.log('parseMessage attributes:', attributes);
    if (!attributes) {
      const error = utils.buildError(
        400,
        'DECODING_ERROR',
        'No attributes retrieved from Iot Agent',
      );
      throw error;
    }

    switch (pattern.params.collection.toLowerCase()) {
      case 'application':
        if (instanceId) {
          foundInstance = await Application.findBy(instanceId);
        } else {
          foundInstance = await Application.findOne({
            where: { or: [{ id: client.appId }, { appEui: client.appEui }] },
          });
        }
        if (!foundInstance || foundInstance === null) return null;
        break;
      case 'device':
        foundInstance = await Device.findByPattern(pattern, attributes);
        if (!foundInstance || foundInstance === null) return null;
        Device.emit('publish', { packet, pattern, device: foundInstance, client });
        break;
      case 'sensor':
        foundInstance = await Device.findByPattern(pattern, attributes);
        if (!foundInstance || foundInstance === null) return null;
        Sensor.emit('publish', { device: foundInstance, attributes });
        break;
      case 'measurement':
        break;
      case 'iotagent':
        //  const method = pattern.params.method;
        // const newPacket = await iotAgent.decode(packet, pattern.params);
        // if (newPacket && newPacket.topic) {
        //   return Application.app.publish(newPacket.topic, newPacket.payload, false, 0);
        // }
        break;
      default:
        throw new Error('invalid collection');
    }
    // console.log('parseMessage foundInstance:', pattern.params.collection, foundInstance);
    // update gateway states ?
    return null;
  } catch (error) {
    logger.publish(4, `${collectionName}`, 'parseMessage:err', error);
    throw error;
  }
};

module.exports = Application => {
  Application.validatesUniquenessOf('appEui');
  Application.validatesPresenceOf('ownerId');
  Application.validatesUniquenessOf('name', { scopedTo: ['ownerId'] });

  /**
   * Format packet and send it via MQTT broker
   * @method module:Application.publish
   * @param {object} application - Application instance
   * @param {object} [client] - MQTT client target
   * @fires Server.publish
   */
  Application.publish = async (application, method, client) => {
    try {
      if (!application || !application.ownerId) throw new Error('Wrong application instance');
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
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'publish:err', error);
      throw error;
    }
  };

  /**
   * Reset keys for this application instance
   * @method module:Application.prototype.resetKeys
   * @returns {object} this
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
   * @returns {function} application.updateAttributes
   */
  Application.refreshToken = async (ctx, appId) => {
    try {
      logger.publish(4, `${collectionName}`, 'refreshToken:req', appId);
      if (!ctx.req.accessToken) throw utils.buildError(403, 'NO_TOKEN', 'User is not authentified');

      if (!appId) throw new Error('missing argument');
      const application = await Application.findById(appId);
      if (ctx.req.accessToken.userId.toString() !== application.ownerId.toString()) {
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
      const error = utils.buildError(
        404,
        'APP_NOT_FOUND',
        "The application requested doesn't exist",
      );
      throw error;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'refreshToken:err', error);
      throw error;
    }
  };

  /**
   * Dispatch incoming MQTT packet
   * @method module:Application.onPublish
   * @param {object} packet - MQTT bridge packet
   * @param {object} client - MQTT client
   * @param {object} pattern - Pattern detected by Iot-Agent
   * @returns {functions} Application~parseApplicationMessage
   */
  Application.onPublish = async (packet, client, pattern) => {
    try {
      logger.publish(4, `${collectionName}`, 'onPublish:req', pattern);
      if (
        !pattern.name ||
        !pattern.params ||
        !pattern.params.method ||
        !pattern.params.collection
      ) {
        throw new Error('Invalid inputs');
      }

      return parseMessage(Application.app, packet, pattern, client);
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'onPublish:err', error);
      throw error;
    }
  };

  /**
   * Detect application known pattern and load the application instance
   * @method module:Application~detector
   * @param {object} packet - MQTT packet
   * @param {object} client - MQTT client
   * @returns {object} pattern
   */
  Application.detector = async (packet, client) => {
    try {
      // const pattern = {name: 'empty', params: null};
      if (packet.topic.split('/')[0] === '$SYS') return null;
      logger.publish(5, collectionName, 'detector:req', packet.topic);
      const filter = { where: {} };
      if (client.appEui) {
        filter.where.appEui = client.appEui;
      } else if (client.appId) {
        filter.where.appId = client.appId;
      } else {
        throw new Error('Invalid application client');
      }
      const application = await Application.findOne(filter);
      if (!application || application === null) {
        throw new Error('No application found');
      }
      const pattern = appPatternDetector(packet, application);
      logger.publish(5, collectionName, 'detector:res', pattern);
      return pattern;
    } catch (error) {
      logger.publish(2, collectionName, 'detector:err', error);
      throw error;
    }
  };

  /**
   * Update application status from MQTT conection status
   * @method module:Application.updateStatus
   * @param {object} client - MQTT client
   * @param {boolean} status - MQTT conection status
   * @returns {function} application.updateAttributes
   */
  Application.updateStatus = async (client, status) => {
    try {
      if (!client || !client.id || !client.appId) {
        throw new Error('Invalid client');
      }
      logger.publish(4, collectionName, 'updateStatus:req', status);
      const Client = Application.app.models.Client;
      const application = await Application.findById(client.user);
      if (application && application.id && application.id.toString() === client.appId.toString()) {
        let frameCounter = application.frameCounter;
        let ttl;
        client.status = status;

        const clients = application.clients;
        const index = clients.indexOf(client.id);
        if (status) {
          if (index === -1) {
            clients.push(client.id);
          }
          ttl = 7 * 24 * 60 * 60 * 1000;
          if (clients.length === 1) {
            frameCounter = 1;
          }
          await Client.set(client.id, JSON.stringify(client), ttl);
        } else {
          ttl = 1 * 24 * 60 * 60 * 1000;
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
              devices.map(async device => {
                try {
                  return device.updateAttributes({ frameCounter, status });
                } catch (e) {
                  return null;
                }
              }),
            );
            // await Promise.all(updateDevices);
          }
          await Client.delete(client.id);
        }

        logger.publish(4, collectionName, 'updateStatus:res', client);
        await application.updateAttributes({ frameCounter, status, clients });
        return client;
      }
      // throw new Error('No application found');
      return null;
    } catch (error) {
      logger.publish(2, collectionName, 'updateStatus:err', error);
      throw error;
    }
  };

  /**
   * Endpoint for application authentification with APIKey
   *
   * @method module:Application.authenticate
   * @param {any} applicationId
   * @param {string} key
   * @returns {object} matched The matching application and key; one of:
   * - clientKey
   * - apiKey
   * - javaScriptKey
   * - restApiKey
   * - windowsKey
   * - masterKey
   */
  Application.authenticate = async (appId, key) => {
    try {
      const application = await Application.findById(appId);
      if (!application || !application.id) {
        const error = utils.buildError(404, 'APPLICATION_NOTFOUND', 'Wrong application');
        throw error;
      }

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
        const error = utils.buildError(403, 'UNAUTHORIZED', 'Wrong key used');
        throw error;
      }
      return result;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'authenticate:err', error);
      throw error;
    }
  };

  /**
   * Endpoint to get resources attached to an application
   * @method module:Application.getState
   * @param {string} applicationId
   * @returns {object} application
   */
  Application.getState = async appId => {
    try {
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
          const promises = await devices.map(Application.app.models.SensorResource.includeCache);
          application.devices = await Promise.all(promises);
        } else {
          application.devices = [];
        }
        return application;
      }
      const error = utils.buildError(404, 'APPLICATION_NOTFOUND', 'Wrong application');
      throw error;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'getState:err', error);
      throw error;
    }
  };

  /**
   * Event reporting that an application client connection status has changed.
   * @event client
   * @param {object} message - Parsed MQTT message.
   * @property {object} message.client - MQTT client
   * @property {boolean} message.status - MQTT client status.
   * @returns {function} Application.updateStatus
   */
  Application.on('client', async message => {
    try {
      logger.publish(2, `${collectionName}`, 'on-client:req', Object.keys(message));
      if (!message || message === null) throw new Error('Message empty');
      const status = message.status;
      const client = message.client;
      if (!client || !client.user) {
        throw new Error('Message missing properties');
      }
      await Application.updateStatus(client, status);
    } catch (error) {
      throw error;
    }
  });

  /**
   * Event reporting that an application client sent a message.
   * @event publish
   * @param {object} message - Parsed MQTT message.
   * @property {object} message.packet - MQTT packet.
   * @property {object} message.pattern - Pattern detected
   * @property {object} message.client - MQTT client
   * @returns {function} Application.onPublish
   */
  Application.on('publish', async message => {
    try {
      if (!message || message === null) throw new Error('Message empty');
      const packet = message.packet;
      const pattern = message.pattern;
      const client = message.client;
      logger.publish(4, collectionName, 'on:publish:req', pattern.name);
      if (!packet || !pattern) throw new Error('Message missing properties');
      await Application.onPublish(packet, client, pattern);
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'on-publish:err', error);
    }
  });

  Application.on('stopped', async () => {
    try {
      if (process.env.CLUSTER_MODE) {
        if (process.env.PROCESS_ID !== '0') return null;
        if (process.env.INSTANCES_PREFIX && process.env.INSTANCES_PREFIX !== '1') return null;
      }
      await Application.updateAll({ status: true }, { status: false, clients: [] });
      logger.publish(3, `${collectionName}`, 'on-stop:res', '');
      return null;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'on-stop:err', error);
      return null;
    }
  });

  /**
   * Event reporting that an application instance will be created or updated.
   * @event before_save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Application instance
   * @returns {function} Application~onBeforeSave
   */
  Application.observe('before save', onBeforeSave);

  /**
   * Event reporting that a device instance has been created or updated.
   * @event after_save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Application instance
   * @returns {function} Application~onAfterSave
   */
  Application.observe('after save', onAfterSave);

  /**
   * Event reporting that an application instance will be deleted.
   * @event before_delete
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.where.id - Application instance
   * @returns {function} Application~onBeforeDelete
   */
  Application.observe('before delete', onBeforeDelete);

  Application.beforeRemote('**', onBeforeRemote);

  Application.afterRemoteError('*', (ctx, next) => {
    logger.publish(4, `${collectionName}`, `after ${ctx.methodString}:err`, '');
    // publish on collectionName/ERROR
    next();
  });

  /**
   * Find applications
   * @method module:Application.find
   * @param {object} filter
   * @returns {object}
   */

  /**
   * Returns applications length
   * @method module:Application.count
   * @param {object} where
   * @returns {number}
   */

  /**
   * Find application by id
   * @method module:Application.findById
   * @param {any} id
   * @param {object} filter
   * @returns {object}
   */

  /**
   * Create application
   * @method module:Application.create
   * @param {object} application
   * @returns {object}
   */

  /**
   * Update application by id
   * @method module:Application.updateById
   * @param {any} id
   * @param {object} filter
   * @returns {object}
   */

  /**
   * Delete application by id
   * @method module:Application.deleteById
   * @param {any} id
   * @param {object} filter
   * @returns {object}
   */

  Application.disableRemoteMethodByName('count');
  Application.disableRemoteMethodByName('upsertWithWhere');
  Application.disableRemoteMethodByName('replaceOrCreate');
  Application.disableRemoteMethodByName('createChangeStream');

  Application.disableRemoteMethodByName('prototype.__link__collaborators');
  Application.disableRemoteMethodByName('prototype.__unlink__collaborators');
};
