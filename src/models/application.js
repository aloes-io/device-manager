import { appPatternDetector, publish } from 'iot-agent';
import logger from '../services/logger';
import utils from '../services/utils';

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
    if (ctx.data) {
      logger.publish(5, `${collectionName}`, 'beforeSave:req', ctx.data);
      filteredProperties.forEach(p => delete ctx.data[p]);
      ctx.hookState.updateData = ctx.data;
      return ctx;
    }
    if (ctx.instance) {
      logger.publish(5, `${collectionName}`, 'beforeSave:req', ctx.instance);
      const promises = await filteredProperties.map(async prop =>
        ctx.instance.unsetAttribute(prop),
      );
      await Promise.all(promises);
      logger.publish(5, collectionName, 'beforeSave:res', ctx.instance);
      return ctx;
    }
    return ctx;
  } catch (error) {
    logger.publish(3, `${collectionName}`, 'beforeSave:err', error);
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
    // if (!device.restApiKey) {
    //   attributes.restApiKey = utils.generateKey('restApi');
    // }
    // if (!device.javaScriptKey) {
    //   attributes.javaScriptKey = utils.generateKey('javaScript');
    // }
    // if (!device.windowsKey) {
    //   attributes.windowsKey = utils.generateKey('windows');
    // }
    // if (!device.masterKey) {
    //   attributes.masterKey = utils.generateKey('master');
    // }
    if (hasChanged) {
      await application.updateAttributes(attributes);
    }
    return application;
  } catch (error) {
    throw error;
  }
};

/**
 * Init device depencies ( token )
 * @method module:Application~createProps
 * @param {object} ctx - Application context
 * @param {object} ctx.req - HTTP request
 * @param {object} ctx.res - HTTP response
 * @returns {function} Application.publish
 */
const createProps = async ctx => {
  try {
    const application = await createKeys(ctx.instance);
    // if (!application.apiKey) {
    //   await Application.destroyById(ctx.instance.id);
    //   throw new Error('Application failed to be created');
    // }
    //  await utils.mkDirByPathSync(`${process.env.FS_PATH}/${ctx.instance.id}`);
    //  logger.publish(4, `${collectionName}`, 'createDeviceProps:res', container);
    if (!ctx.Model) return null;
    await ctx.Model.publish(application, 'POST');
    return application;
  } catch (error) {
    throw error;
  }
};

/**
 * Update application depencies
 * @method module:Application~updateProps
 * @param {object} ctx - Application context
 * @param {object} ctx.req - HTTP request
 * @param {object} ctx.res - HTTP response
 * @returns {function} Application.publish
 */
const updateProps = async ctx => {
  try {
    const application = await createKeys(ctx.instance);
    if (!ctx.Model) return null;
    await ctx.Model.publish(application, 'PUT');
    return application;
  } catch (error) {
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
      logger.publish(4, `${collectionName}`, 'afterSave:req', ctx.hookState.updateData);
      const updatedProps = Object.keys(ctx.hookState.updateData);
      if (updatedProps.some(prop => prop === 'status')) {
        // if (!ctx.instance) console.log('AFTER APP SAVE', ctx.where);
        if (ctx.instance) await ctx.Model.publish(ctx.instance, 'PUT');
      }
    } else if (ctx.instance && ctx.Model) {
      logger.publish(4, `${collectionName}`, 'afterSave:req', ctx.instance);
      if (ctx.isNewInstance) {
        await createProps(ctx);
      } else {
        await updateProps(ctx);
      }
    }
    return ctx;
  } catch (error) {
    logger.publish(3, `${collectionName}`, 'afterSave:err', error);
    throw error;
  }
};

/**
 * Remove application depencies
 * @method module:Application~deleteProps
 * @param {object} app - Loopback app
 * @param {object} instance
 * @returns {function} Application.publish
 */
const deleteProps = async (app, instance) => {
  try {
    if (!instance || !instance.id || !instance.ownerId) {
      throw utils.buildError(403, 'INVALID_DEVICE', 'Invalid device instance');
    }
    const Device = app.models.Device;
    const devices = await Device.find({ where: { appEui: instance.appEui } });
    if (devices && devices.length > 0) {
      const promises = await devices.map(async device => device.delete());
      await Promise.all(promises);
    }
    await app.models.Application.publish(instance, 'DELETE');
    logger.publish(4, `${collectionName}`, 'deleteProps:req', instance);
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
      await Promise.all(applications.map(async instance => deleteProps(ctx.Model.app, instance)));
    }
    return ctx;
  } catch (error) {
    throw error;
  }
};

const onBeforeRemote = async ctx => {
  try {
    //  console.log('beofre getState', ctx.args);
    // if (ctx.req.headers.apikey) ctx.args.options.apikey = ctx.req.headers.apikey;
    // if (ctx.req.headers.appId) ctx.args.options.appId = ctx.req.headers.appId;
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
        if (options.currentUser.devEui) {
          ctx.args.client.devEui = options.currentUser.devEui;
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
        if (options.currentUser.devEui) {
          ctx.args.client.devEui = options.currentUser.devEui;
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
        if (options.currentUser.devEui) {
          if (options.currentUser.id.toString() !== ctx.args.deviceId.toString()) {
            const error = utils.buildError(
              401,
              'INVALID_USER',
              'Only device itself can trigger this endpoint',
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

  Application.disableRemoteMethodByName('count');
  Application.disableRemoteMethodByName('upsertWithWhere');
  Application.disableRemoteMethodByName('replaceOrCreate');
  Application.disableRemoteMethodByName('createChangeStream');

  Application.disableRemoteMethodByName('prototype.__link__collaborators');
  Application.disableRemoteMethodByName('prototype.__unlink__collaborators');

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
   * @param {object} application - Application instance
   * @returns {function} application.updateAttributes
   */
  Application.refreshToken = async (ctx, application) => {
    try {
      logger.publish(4, `${collectionName}`, 'refreshToken:req', application.id);
      if (!ctx.req.accessToken) throw new Error('missing token');
      if (!application.id) throw new Error('missing application.id');
      if (ctx.req.accessToken.userId.toString() !== application.ownerId.toString()) {
        throw new Error('Invalid user');
      }
      application = await Application.findById(application.id);
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
      throw new Error('Missing Application instance');
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
      const Device = Application.app.models.Device;
      const Sensor = Application.app.models.Sensor;
      const attributes = JSON.parse(packet.payload);
      let foundInstance = null;
      let instanceId;
      if (pattern.params.modelId) {
        instanceId = pattern.params.modelId;
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
          console.log('onPublish application:', foundInstance);
          break;
        case 'device':
          foundInstance = await Device.findByPattern(pattern, attributes);
          if (!foundInstance || foundInstance === null) return null;
          await Device.emit('publish', { packet, pattern, device: foundInstance, client });
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

      // update gateway states ?
      return null;
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
      if (!client || !client.id || !client.appId || client.appId === null) {
        throw new Error('Invalid client type');
      }
      logger.publish(4, collectionName, 'updateStatus:req', status);
      const Client = Application.app.models.Client;
      const application = await Application.findById(client.user);
      if (
        application &&
        application !== null &&
        application.id.toString() === client.appId.toString()
      ) {
        let frameCounter = application.frameCounter;
        let ttl;
        let foundClient = JSON.parse(await Client.get(client.id));
        if (!foundClient) {
          foundClient = { id: client.id, type: 'MQTT' };
        }

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

            const updateDevices = await devices.map(async device =>
              device.updateAttributes({ frameCounter, status }),
            );
            await Promise.all(updateDevices);
          }
        }

        foundClient.status = status;
        await Client.set(client.id, JSON.stringify(foundClient), ttl);
        logger.publish(4, collectionName, 'updateStatus:res', foundClient);
        await application.updateAttributes({ frameCounter, status, clients });
        return foundClient;
      }
      throw new Error('No application found');
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
      if (!application) {
        throw new Error(' Cannot authenticate application');
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
        if (application[k] && application[k] === key) {
          result = {
            application,
            keyType: k,
          };
        }
      });
      if (!result.application || !result.keyType) {
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
  Application.getState = async (appId, options) => {
    try {
      if (!options || !options.apikey) throw new Error('missing token');
      if (!appId && !options.appId) throw new Error('missing application.id');
      const tokenId = options.apikey.trim();
      logger.publish(4, `${collectionName}`, 'getState:req', { appId, tokenId });

      const auth = await Application.authenticate(appId, tokenId);
      if (auth && auth.application) {
        const application = auth.application;
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
      //  ctx.res.status(403);
      throw new Error('Failed to authenticate application');
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
      logger.publish(4, collectionName, 'on:publish', '');
      if (!message || message === null) throw new Error('Message empty');
      const packet = message.packet;
      const pattern = message.pattern;
      const client = message.client;
      if (!packet || !pattern) throw new Error('Message missing properties');
      await Application.onPublish(packet, client, pattern);
    } catch (error) {
      throw error;
    }
  });

  Application.on('stopped', async () => {
    try {
      if (process.env.CLUSTER_MODE) {
        if (process.env.PROCESS_ID !== '0') return null;
        if (process.env.INSTANCES_PREFIX && process.env.INSTANCES_PREFIX !== '1') return null;
      }
      await Application.updateAll({ status: true }, { status: false, clients: [] });
      logger.publish(3, `${collectionName}`, 'stop:res', '');
      return null;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'stop:err', error);
      throw error;
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

  Application.afterRemoteError('*', ctx => {
    logger.publish(4, `${collectionName}`, `after ${ctx.methodString}:err`, '');
    // publish on collectionName/ERROR
    return ctx;
  });
};
