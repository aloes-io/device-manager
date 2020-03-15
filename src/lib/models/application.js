/* Copyright 2020 Edouard Maleix, read LICENSE */

import logger from '../../services/logger';
import utils from '../utils';

export const collectionName = 'Application';

const filteredProperties = ['children', 'size', 'show', 'group', 'success', 'error'];

/**
 * Validate instance before creation
 * @method module:Application~onBeforeSave
 * @param {object} ctx - Loopback context
 * @returns {Promise<object>} ctx
 */
export const onBeforeSave = async ctx => {
  if (ctx.options && ctx.options.skipPropertyFilter) return ctx;
  if (ctx.instance) {
    logger.publish(4, `${collectionName}`, 'onBeforeSave:req', ctx.instance);
    await Promise.all(filteredProperties.map(async prop => ctx.instance.unsetAttribute(prop)));
    return ctx;
  }
  if (ctx.data) {
    logger.publish(4, `${collectionName}`, 'onBeforePartialSave:req', ctx.data);
    // if (ctx.where && ctx.where.id && !ctx.where.id.inq) {
    //   const application = await ctx.Model.findById(ctx.where.id);
    // } else {
    //   const applications = await ctx.Model.find({ where: ctx.where });
    //   if (applications && applications.length > 0) {
    //     await Promise.all(
    //       applications.map(async application => application._resources.save(ctx.data.resources)),
    //     );
    //   }
    // }
    // eslint-disable-next-line security/detect-object-injection
    filteredProperties.forEach(p => delete ctx.data[p]);
    ctx.hookState.updateData = ctx.data;
    return ctx;
  }
  return ctx;
};

/**
 * Keys creation helper - update application attributes
 * @method module:Application~createKeys
 * @param {object} application - Application instance
 * @returns {Promise<object>} application
 */
const createKeys = async application => {
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
};

/**
 * Init application dependencies ( token )
 * @method module:Application~createProps
 * @param {object} app - Loopback app
 * @param {object} instance - Application instance
 * @returns {Promise<function>} Application.publish
 */
const createProps = async (app, instance) => {
  instance = await createKeys(instance);
  // if (!application.apiKey) {
  //   await instance.destroy()
  //   throw new Error('Application failed to be created');
  // }
  return app.models.Application.publish(instance, 'POST');
};

/**
 * Update application depencies
 * @method module:Application~updateProps
 * @param {object} app - Loopback app
 * @param {object} instance - Application instance
 * @returns {Promise<function>} Application.publish
 */
const updateProps = async (app, instance) => {
  try {
    instance = await createKeys(instance);
    await app.models.Application.publish(instance, 'PUT');
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'updateProps:err', error);
    // throw error;
  }
};

/**
 * Create relations on instance creation
 * @method module:Application~onAfterSave
 * @param {object} ctx - Loopback context
 * @returns {Promise<object>} ctx
 */
export const onAfterSave = async ctx => {
  if (ctx.hookState.updateData) {
    logger.publish(4, `${collectionName}`, 'afterSave:req', ctx.hookState.updateData);
    const updatedProps = Object.keys(ctx.hookState.updateData);
    if (updatedProps.some(prop => prop === 'status')) {
      // if (!ctx.instance) console.log('AFTER APP SAVE', ctx.where);
      // todo : if (ctx.where) update all ctx.where
      if (ctx.instance && ctx.instance.id) await ctx.Model.publish(ctx.instance, 'HEAD');
    }
  } else if (ctx.instance && ctx.Model) {
    logger.publish(4, `${collectionName}`, 'afterSave:req', ctx.instance);
    if (ctx.isNewInstance) {
      await createProps(ctx.Model.app, ctx.instance);
    } else {
      await updateProps(ctx.Model.app, ctx.instance);
    }
  }
  return ctx;
};

/**
 * Remove application dependencies
 * @method module:Application~deleteProps
 * @param {object} app - Loopback app
 * @param {object} instance
 * @returns {Promise<function>} Application.publish
 */
const deleteProps = async (app, instance) => {
  try {
    logger.publish(4, `${collectionName}`, 'deleteProps:req', instance);
    // const Device = app.models.Device;
    // const devices = await Device.find({ where: { appEui: instance.appEui } });
    // if (devices && devices.length > 0) {
    //   const promises = await devices.map(async device => device.delete());
    //   await Promise.all(promises);
    // }
    await app.models.Application.publish(instance, 'DELETE');
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'deleteProps:err', error);
  }
};

/**
 * Delete relations on instance(s) deletetion
 * @method module:Application~onBeforeDelete
 * @param {object} ctx - Loopback context
 * @returns {Promise<object>} ctx
 */
export const onBeforeDelete = async ctx => {
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
};

/**
 * Called when a remote method tries to access Application Model / instance
 * @method module:Application~onBeforeRemote
 * @param {object} app - Loopback App
 * @param {object} ctx - Express context
 * @param {object} ctx.req - Request
 * @param {object} ctx.res - Response
 * @returns {Promise<object>} ctx
 */
export const onBeforeRemote = async ctx => {
  if (
    ctx.method.name.indexOf('find') !== -1 ||
    ctx.method.name.indexOf('__get') !== -1 ||
    ctx.method.name === 'get'
    // count
    // ctx.method.name.indexOf('get') !== -1
  ) {
    const options = ctx.options || {};
    const ownerId = utils.getOwnerId(options);
    const isAdmin = options.currentUser.roles.includes('admin');
    if (ctx.req.query && ctx.req.query.filter && !isAdmin) {
      if (typeof ctx.req.query.filter === 'string') {
        ctx.req.query.filter = JSON.parse(ctx.req.query.filter);
      }
      if (!ctx.req.query.filter.where) ctx.req.query.filter.where = {};
      ctx.req.query.filter.where.ownerId = ownerId;
    }
    if (ctx.req.params && !isAdmin) {
      ctx.req.params.ownerId = ownerId;
    }
  } else if (ctx.method.name === 'refreshToken') {
    const options = ctx.options || {};
    ctx.args.ownerId = utils.getOwnerId(options);
  } else if (ctx.method.name === 'onPublish' || ctx.method.name === 'updateStatus') {
    const options = ctx.options || {};
    const isAdmin = options.currentUser.roles.includes('admin');
    if (!ctx.args.client) ctx.args.client = {};
    if (!isAdmin) {
      ctx.args.client.user = options.currentUser.id.toString();
      if (options.currentUser.appEui) {
        ctx.args.client.appEui = options.currentUser.appEui;
      }
    }
  } else if (ctx.method.name === 'getState' || ctx.method.name === 'getFullState') {
    const options = ctx.options || {};
    const isAdmin = options.currentUser.roles.includes('admin');
    if (!isAdmin && options.currentUser.appEui) {
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
  return ctx;
};

/**
 * Find properties and dispatch to the right function
 *
 * Adding device and sensor context to raw incoming data
 *
 * @async
 * @method module:Application~parseMessage
 * @param {object} app - Loopback app
 * @param {object} packet - MQTT packet
 * @param {object} pattern - Pattern detected by IotAgent
 * @param {object} client - MQTT client
 * @fires Device.publish
 * @fires Sensor.publish
 */
export const parseMessage = async (app, packet, pattern, client) => {
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
    throw utils.buildError(400, 'DECODING_ERROR', 'No attributes retrieved from Iot Agent');
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
      // todo switch method and apply it to application instance
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
};
