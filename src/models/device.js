/* Copyright 2019 Edouard Maleix, read LICENSE */

import crypto from 'crypto';
import iotAgent from 'iot-agent';
import isAlphanumeric from 'validator/lib/isAlphanumeric';
import isLength from 'validator/lib/isLength';
// import isHexadecimal from 'validator/lib/isHexadecimal';
import isMACAddress from 'validator/lib/isMACAddress';
import logger from '../services/logger';
import utils from '../services/utils';
import DeltaTimer from '../services/delta-timer';
import deviceTypes from '../initial-data/device-types.json';
import protocols from '../initial-data/protocols.json';

/**
 * @module Device
 * @property {String} id  Database generated ID.
 * @property {String} name Unique name defined by user required.
 * @property {String} description Define device purpose.
 * @property {String} devEui hardware generated Device Id required.
 * @property {String} devAddr randomly generated non unique Device Id required.
 * @property {String} apiKey key to access Aloes as client.
 * @property {String} clientKey key to access Aloes as client.
 * @property {Date} lastSignal
 * @property {Number} frameCounter Number of messages since last connection
 * @property {String} type Device type ( /initial-data/device-types.json )
 * @property {Array} icons automatically set based on device type
 * @property {String} accessPointUrl
 * @property {String} qrCode Filled URL containing device access point
 * @property {String} transportProtocol Framework used for message transportation
 * @property {String} transportProtocolVersion Framework version
 * @property {String} messageProtocol Framework used for message encoding
 * @property {String} messageProtocolVersion Framework version
 * @property {Array} collaborators A list of users ids who have permissions to use this device
 * @property {Array} clients A list of client ids authentified as this device
 * @property {Array} applications A list of application ids who have rights to listen device events
 * @property {String} ownerId User ID of the user who has registered the device.
 */

const collectionName = 'Device';
const filteredProperties = ['children', 'size', 'show', 'group', 'success', 'error'];
// const clockInterval = 5 * 60 * 1000;

/**
 * Set device QRcode access based on declared protocol and access point url
 * @method module:Device~setDeviceQRCode
 * @param {object} device - Device instance
 * @returns {object} device
 */
const setDeviceQRCode = device => {
  try {
    switch (device.transportProtocol.toLowerCase()) {
      case 'mysensors':
        if (device.accessPointUrl && device.accessPointUrl.endsWith('/#!1')) {
          device.qrCode = `${device.accessPointUrl}`;
        } else if (device.accessPointUrl && device.id && device.apiKey) {
          if (process.env.HTTP_SECURE) {
            device.qrCode = `${device.qrCode}http_server=${
              process.env.DOMAIN
            }&http_port=443&http_secure=true`;
          } else {
            device.qrCode = `${device.qrCode}http_server=${
              process.env.DOMAIN
            }&http_port=80&http_secure=false`;
          }
          if (process.env.MQTT_SECURE) {
            device.qrCode = `${device.qrCode}&mqtt_server=${
              process.env.DOMAIN
            }&mqtt_port=443&mqtt_secure=true`;
          } else {
            device.qrCode = `${device.qrCode}&mqtt_server=${
              process.env.DOMAIN
            }&mqtt_port=80&mqtt_secure=false`;
          }
          device.qrCode = `${device.accessPointUrl}&device_id=${device.id}&apikey=${device.apiKey}`;
        }
        break;
      case 'aloeslight':
        if (device.accessPointUrl && device.accessPointUrl.endsWith('/#!1')) {
          device.qrCode = `${device.accessPointUrl}`;
        } else if (device.accessPointUrl && device.id && device.apiKey) {
          device.qrCode = `${device.accessPointUrl}/param?`;
          if (process.env.HTTP_SECURE) {
            device.qrCode = `${device.qrCode}http_server=${
              process.env.DOMAIN
            }&http_port=443&http_secure=true`;
          } else {
            device.qrCode = `${device.qrCode}http_server=${
              process.env.DOMAIN
            }&http_port=80&http_secure=false`;
          }
          if (process.env.MQTT_SECURE) {
            device.qrCode = `${device.qrCode}&mqtt_server=${
              process.env.DOMAIN
            }&mqtt_port=8883&mqtt_secure=true`;
          } else {
            device.qrCode = `${device.qrCode}&mqtt_server=${
              process.env.DOMAIN
            }&mqtt_port=1883&mqtt_secure=false`;
          }
          device.qrCode = `${device.accessPointUrl}&device_id=${device.id}&apikey=${device.apiKey}`;
        }
        break;
      default:
      //  console.log(device);
    }
    return device;
  } catch (error) {
    throw error;
  }
};

/**
 * Set device icons ( urls ) based on its type
 * @method module:Device~setDeviceIcons
 * @param {object} device - Device instance
 * @returns {object} device
 */
const setDeviceIcons = device => {
  try {
    if (device.type && deviceTypes[device.type]) {
      device.icons[0] = deviceTypes[device.type].icons[0];
      device.icons[1] = deviceTypes[device.type].icons[1];
    }
    return device;
  } catch (error) {
    throw error;
  }
};

/**
 * Validate instance before creation
 * @method module:Device~onBeforeSave
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
      if (ctx.instance.transportProtocol && ctx.instance.transportProtocol !== null) {
        await setDeviceQRCode(ctx.instance);
      }
      //  logger.publish(3, `${collectionName}`, "beforeSave:res1", device);
      if (ctx.instance.type && ctx.instance.type !== null) {
        await setDeviceIcons(ctx.instance);
      }
      logger.publish(3, collectionName, 'onBeforeSave:res', ctx.instance);
      return ctx;
    }
    if (ctx.data) {
      logger.publish(4, `${collectionName}`, 'onBeforePartialSave:req', ctx.data);
      // eslint-disable-next-line security/detect-object-injection
      filteredProperties.forEach(p => delete ctx.data[p]);
      ctx.hookState.updateData = ctx.data;
      return ctx;
    }
    // else if (ctx.currentInstance) {
    //   device = ctx.currentInstance;
    // }
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onBeforeSave:err', error);
    throw error;
  }
};

/**
 * Keys creation helper - update device attributes
 * @method module:Device~createKeys
 * @param {object} device - Device instance
 * @returns {object} device
 */
const createKeys = async device => {
  try {
    logger.publish(5, `${collectionName}`, 'createKeys:req', device.name);
    const attributes = {};
    let hasChanged = false;
    if (!device.clientKey || device.clientKey === null) {
      attributes.clientKey = utils.generateKey('client');
      hasChanged = true;
    }
    if (!device.apiKey || device.apiKey === null) {
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
      await device.updateAttributes(attributes);
      logger.publish(4, `${collectionName}`, 'createKeys:res', device.apiKey);
    }
    return device;
  } catch (error) {
    logger.publish(3, `${collectionName}`, 'createKeys:err', error);
    throw error;
  }
};

/**
 * Init device dependencies ( token, address )
 * @method module:Device~createProps
 * @param {object} app - Loopback app
 * @param {object} instance - Device instance
 * @returns {function} Device.publish
 */
const createProps = async (app, instance) => {
  try {
    await instance.address.create({
      street: '',
      streetNumber: null,
      streetName: null,
      postalCode: null,
      city: null,
      public: false,
    });
    instance = await createKeys(instance);
    // todo create a sensor 3310 to report event and request network load
    if (!instance.address() || !instance.apiKey) {
      await app.models.Device.destroyById(instance.id);
      // await instance.destroy()
      throw new Error('no device address');
    }
    return app.models.Device.publish(instance, 'POST');
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'createProps:err', error);
    throw error;
  }
};

/**
 * Update device depencies ( token, sensors )
 * @method module:Device~updateProps
 * @param {object} app - Loopback app
 * @param {object} instance - Device instance
 * @returns {function} Device.publish
 */
const updateProps = async (app, instance) => {
  try {
    // instance = await createKeys(instance);
    await createKeys(instance);
    const sensorsCount = await instance.sensors.count();
    if (sensorsCount && sensorsCount > 0) {
      await app.models.SensorResource.updateCache(instance);
    }

    const defaultAddress = {
      street: '',
      streetNumber: null,
      streetName: null,
      postalCode: null,
      city: null,
      public: false,
    };
    if (!instance.address || !instance.address()) {
      try {
        await instance.address.create(defaultAddress);
      } catch (e) {
        await instance.address.destroy();
        await instance.address.create(defaultAddress);
      }
    }

    return app.models.Device.publish(instance, 'PUT');
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'updateProps:err', error);
    throw error;
  }
};

const appendCachedSensors = async (app, ctx) => {
  try {
    logger.publish(4, `${collectionName}`, 'appendCachedSensors:req', {
      query: ctx.req.query,
      params: ctx.req.params,
    });
    let getSensors = false;
    let result;
    const Device = app.models.Device;

    if (ctx.method.name.startsWith('__get')) {
      const modelName = ctx.method.name.split('__')[2];
      const params = ctx.req.params;
      //  console.log('[DEVICE] beforeRemote get:req', modelName, params);
      if (modelName === 'sensors' && params && params.id) {
        getSensors = true;
        const id = params.id;
        let device = {};
        if (params.ownerId) {
          device = await Device.find({ where: { and: [{ id }, { ownerId: params.ownerId }] } });
        } else {
          device = await Device.findById(id);
        }
        result = [JSON.parse(JSON.stringify(device))];
      }
    }

    if (ctx.req.query.filter) {
      let whereFilter;
      if (typeof ctx.req.query.filter === 'string') {
        whereFilter = JSON.parse(ctx.req.query.filter);
      } else if (typeof ctx.req.query.filter === 'object') {
        whereFilter = ctx.req.query.filter;
      }
      // console.log('[DEVICE] appendCachedSensors:req', whereFilter);

      if (whereFilter.include) {
        if (typeof whereFilter.include === 'object') {
          const index = whereFilter.include.indexOf('sensors');
          getSensors = true;
          if (index !== -1) {
            whereFilter.include.splice(index, 1);
          }
        } else if (typeof whereFilter.include === 'string') {
          if (whereFilter.include.search('sensor') !== -1) {
            getSensors = true;
            delete whereFilter.include;
          }
        } else if (
          whereFilter.include.relation &&
          typeof whereFilter.include.relation === 'string'
        ) {
          if (whereFilter.include.relation.search('sensor') !== -1) {
            getSensors = true;
            delete whereFilter.include;
          }
        }
      }
      if (whereFilter.where) {
        const devices = await Device.find(whereFilter);
        result = JSON.parse(JSON.stringify(devices));
      } else if (whereFilter && whereFilter.id && !whereFilter.id.inq) {
        const id = whereFilter.id;
        const device = await Device.findById(id);
        result = [JSON.parse(JSON.stringify(device))];
      }
    }
    if (result && getSensors) {
      const promises = await result.map(app.models.SensorResource.includeCache);
      result = await Promise.all(promises);
    }
    // logger.publish(4, `${collectionName}`, 'appendCachedSensors:res', result.length || 0);
    return result;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'appendCachedSensors:err', error);
    throw error;
  }
};

/**
 * Create relations on instance creation
 * @method module:Device~onAfterSave
 * @param {object} ctx - Loopback context
 * @returns {object} ctx
 */
const onAfterSave = async ctx => {
  try {
    if (ctx.hookState.updateData) {
      logger.publish(3, `${collectionName}`, 'onAfterPartialSave:req', ctx.hookState.updateData);
      const updatedProps = Object.keys(ctx.hookState.updateData);
      if (updatedProps.some(prop => prop === 'status')) {
        // todo : if (ctx.where) update all ctx.where
        if (ctx.instance && ctx.instance.id) await ctx.Model.publish(ctx.instance, 'HEAD');
      }
    } else if (ctx.instance && ctx.Model.app) {
      logger.publish(3, `${collectionName}`, 'onAfterSave:req', ctx.instance);
      if (ctx.isNewInstance) {
        await createProps(ctx.Model.app, ctx.instance);
      } else {
        await updateProps(ctx.Model.app, ctx.instance);
      }
    }
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onAfterSave:err', error);
    throw error;
  }
};

/**
 * Remove device dependencies
 * @method module:Device~deleteProps
 * @param {object} app - Loopback app
 * @param {object} instance
 * @returns {function} Device.publish
 */
const deleteProps = async (app, instance) => {
  try {
    if (!instance || !instance.id || !instance.ownerId) {
      return null;
      //  throw utils.buildError(403, 'INVALID_DEVICE', 'Invalid device instance');
    }
    logger.publish(4, `${collectionName}`, 'deleteProps:req', instance);
    await app.models.Address.destroyAll({
      ownerId: instance.id,
    });
    const sensors = await instance.sensors.find();
    if (sensors && sensors !== null) {
      const promises = await sensors.map(async sensor => sensor.delete());
      await Promise.all(promises);
    }
    await app.models.Device.publish(instance, 'DELETE');
    return instance;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'deleteProps:err', error);
    return null;
  }
};

/**
 * Delete relations on instance(s) deletetion
 * @method module:Device~onBeforeDelete
 * @param {object} ctx - Loopback context
 * @returns {object} ctx
 */
const onBeforeDelete = async ctx => {
  try {
    logger.publish(3, `${collectionName}`, 'onBeforeDelete:req', ctx.where);
    if (ctx.where && ctx.where.id && !ctx.where.id.inq) {
      const device = await ctx.Model.findById(ctx.where.id);
      await deleteProps(ctx.Model.app, device);
    } else {
      const filter = { where: ctx.where };
      const devices = await ctx.Model.find(filter);
      if (devices && devices.length > 0) {
        await Promise.all(devices.map(async device => deleteProps(ctx.Model.app, device)));
      }
    }
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onBeforeDelete:err', error);
    throw error;
  }
};

const onBeforeRemote = async (app, ctx) => {
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
      const result = await appendCachedSensors(app, ctx);
      if (result && result !== null) {
        ctx.result = result;
      }
    } else if (ctx.method.name === 'search' || ctx.method.name === 'geoLocate') {
      const options = ctx.args ? ctx.args.options : {};
      if (!options || !options.currentUser) {
        throw utils.buildError(401, 'UNAUTHORIZED', 'Requires authentification');
      }
      const isAdmin = options.currentUser.roles.includes('admin');
      if (!isAdmin) {
        if (!ctx.args.filter) ctx.args.filter = {};
        ctx.args.filter.ownerId = options.currentUser.id.toString();
        ctx.args.filter.ownerType = options.currentUser.type;
        // ctx.args.filter.public = true;
      }
    } else if (ctx.method.name === 'findByPattern') {
      const options = ctx.args ? ctx.args.options : {};
      if (!options || !options.currentUser) {
        throw utils.buildError(401, 'UNAUTHORIZED', 'Requires authentification');
      }
      const isAdmin = options.currentUser.roles.includes('admin');
      if (!isAdmin) {
        if (!ctx.args.attributes) ctx.args.attributes = {};
        ctx.args.attributes.ownerId = options.currentUser.id.toString();
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
        ctx.args.client.user = options.currentUser.id;
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
        ctx.args.client.user = options.currentUser.id;
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
 * Find properties and dispatch to the right function
 *
 * Adding device and sensor context to raw incoming data
 *
 * @method module:Device~parseMessage
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
    if (!pattern || !pattern.params || !packet || !packet.topic) {
      const error = utils.buildError(403, 'INVALID_ARGS', 'Missing pattern and / or packet');
      throw error;
    }
    const Device = app.models.Device;
    if (pattern.name.toLowerCase() === 'aloesclient') {
      if (pattern.subType === 'iot') {
        const newPacket = iotAgent.decode(packet, pattern.params);
        if (newPacket && newPacket.topic) {
          // todo use client.publish instead ?
          logger.publish(4, `${collectionName}`, 'parseMessage:redirect to', newPacket.topic);
          app.emit('publish', newPacket.topic, newPacket.payload, false, 0);
          return newPacket;
        }
      }
    }
    const attributes = iotAgent.encode(packet, pattern);
    logger.publish(4, `${collectionName}`, 'parseMessage:attributes', attributes);

    if (
      attributes.devEui &&
      attributes.nativeSensorId &&
      (attributes.type || attributes.resource)
    ) {
      logger.publish(4, `${collectionName}`, 'parseMessage:redirect to Sensor', {
        nativeSensorId: attributes.nativeSensorId,
        nativeNodeId: attributes.nativeNodeId,
      });
      let device;
      try {
        device = await Device.findByPattern(pattern, attributes);
      } catch (e) {
        device = null;
      }
      if (!device || device === null) {
        const error = utils.buildError(404, 'DEVICE_NOT_FOUND', 'Device not retrieved from packet');
        throw error;
      }

      app.models.Sensor.emit('publish', {
        device,
        pattern,
        //  sensor: device.sensors[0],
        attributes,
        client,
      });
      return device;
    }

    if (pattern.params.collection === 'Device' && attributes.devEui && attributes.apiKey) {
      logger.publish(4, `${collectionName}`, 'parseMessage:redirect to Device', {
        devEui: attributes.devEui,
      });
      let device;
      if (attributes.id) {
        try {
          device = await Device.findById(attributes.id);
        } catch (e) {
          device = null;
        }
      } else {
        try {
          device = await Device.findByPattern(pattern, attributes);
        } catch (e) {
          device = null;
        }
      }
      if (!device || device === null) {
        const error = utils.buildError(404, 'DEVICE_NOT_FOUND', 'Device not retrieved from packet');
        throw error;
      }
      device = JSON.parse(JSON.stringify(device));
      device = { ...device, ...attributes };
      Device.emit('publish', { device, pattern, client });
      return device;
    }

    const error = utils.buildError(400, 'DECODING_ERROR', 'No attributes retrieved from Iot Agent');
    throw error;
  } catch (error) {
    logger.publish(4, `${collectionName}`, 'parseMessage:err', error);
    throw error;
  }
};

const checkHeader = (headers, key, value = false) => {
  // eslint-disable-next-line security/detect-object-injection
  if (!headers || !headers[key]) return false;
  // eslint-disable-next-line security/detect-object-injection
  if (value && headers[key] !== value) return false;
  return true;
};

const updateESP = async (ctx, deviceId, version) => {
  try {
    const headers = ctx.req.headers;
    // console.log('headers', headers);
    if (
      !checkHeader(headers, 'x-esp8266-sta-mac') ||
      !isMACAddress(headers['x-esp8266-sta-mac']) ||
      !checkHeader(headers, 'x-esp8266-ap-mac') ||
      !checkHeader(headers, 'x-esp8266-free-space') ||
      !checkHeader(headers, 'x-esp8266-sketch-size') ||
      !checkHeader(headers, 'x-esp8266-sketch-md5') ||
      !checkHeader(headers, 'x-esp8266-chip-size') ||
      !checkHeader(headers, 'x-esp8266-sdk-version') ||
      !checkHeader(headers, 'x-esp8266-mode')
    ) {
      const error = utils.buildError(403, 'INVALID_OTA_HEADER', 'invalid ESP8266 header');
      throw error;
    }
    //
    const devEui = headers['x-esp8266-sta-mac'].split(':').join('');
    const filter = {
      where: {
        or: [
          { id: deviceId },
          {
            devEui: {
              // eslint-disable-next-line security/detect-non-literal-regexp
              like: new RegExp(`.*${devEui}.*`, 'i'),
            },
          },
        ],
      },
    };
    const device = await ctx.Model.findOne(filter);
    //  const device = await Device.findById(deviceId);
    //  console.log('#device ', device);
    if (!device || device === null) {
      throw utils.buildError(404, 'NOT_FOUND', 'No device found');
    }

    // console.log('devEui', devEui, device.devEui);
    ctx.res.set('Content-Type', `application/octet-stream`);
    // look for meta containing firmware tag ?
    //  const fileFilter = { where: { role: {like: new RegExp(`.*firmware.*`, 'i')} } };
    // const fileFilter = { where: { name: { like: new RegExp(`.*bin.*`, 'i') } } };
    // const fileMeta = await device.files.findOne(fileFilter);

    const fileFilter = {
      where: {
        and: [
          { ownerId: device.ownerId.toString() },
          { name: { like: new RegExp('.*bin.*', 'i') } },
          // eslint-disable-next-line security/detect-non-literal-regexp
          { name: { like: new RegExp(`.*${device.id}.*`, 'i') } },
        ],
      },
    };

    const fileMeta = await ctx.Model.app.models.files.findOne(fileFilter);
    //  const fileMeta = await device.files.findOne(fileFilter);

    if (version && fileMeta.version && fileMeta.version === version) {
      throw utils.buildError(304, 'UNCHANGED', 'already up to date');
    }
    ctx.res.set('Content-Disposition', `attachment; filename=${fileMeta.name}`);

    //  const readStream = Device.app.models.container.downloadStream(device.id.toString(), fileMeta.name);
    const readStream = ctx.Model.app.models.container.downloadStream(
      device.id.toString(),
      fileMeta.name,
    );
    const md5sum = crypto.createHash('md5');

    const endStream = new Promise((resolve, reject) => {
      const bodyChunks = [];
      readStream.on('data', d => {
        bodyChunks.push(d);
        md5sum.update(d);
      });
      readStream.on('end', () => {
        const hash = md5sum.digest('hex');
        const body = Buffer.concat(bodyChunks);
        //  console.log('#hash ', hash, headers['x-esp8266-sketch-md5']);
        // console.log('file', file);
        ctx.res.set('Content-Length', readStream.bytesRead);
        ctx.res.status(200);
        ctx.res.set('x-MD5', hash);
        resolve(body);
      });
      readStream.on('error', reject);
    });

    const result = await endStream;
    if (result && !(result instanceof Error)) {
      return result;
    }
    throw utils.buildError(304, 'STREAM_ERROR', 'Error while reading stream');
  } catch (error) {
    throw error;
  }
};

const updateFirmware = async (ctx, deviceId, version) => {
  try {
    if (checkHeader(ctx.req.headers, 'user-agent', 'ESP8266-http-Update')) {
      return updateESP(ctx, deviceId, version);
    }
    throw utils.buildError(403, 'WRONG_TARGET', 'only for ESP8266 updater');
  } catch (error) {
    throw error;
  }
};

module.exports = function(Device) {
  function transportProtocolValidator(err) {
    if (
      !this.transportProtocol ||
      !protocols.transport.some(p => p.toLowerCase() === this.transportProtocol.toLowerCase())
    ) {
      err();
    }
  }

  function messageProtocolValidator(err) {
    if (
      !this.messageProtocol ||
      !protocols.message.some(p => p.toLowerCase() === this.messageProtocol.toLowerCase())
    ) {
      err();
    }
  }

  function typeValidator(err) {
    // eslint-disable-next-line security/detect-object-injection
    if (!this.type || !deviceTypes[this.type]) {
      err();
    }
  }

  // function devEuiValidator(err) {
  //   if (!this.devEui || !isHexadecimal(this.devEui)) {
  //     err();
  //   }
  // }

  Device.validate('transportProtocol', transportProtocolValidator, {
    message: 'Wrong transport protocol name',
  });

  Device.validate('messageProtocol', messageProtocolValidator, {
    message: 'Wrong application protocol name',
  });

  Device.validate('type', typeValidator, {
    message: 'Wrong device type',
  });

  Device.validatesPresenceOf('ownerId');

  Device.validatesUniquenessOf('devEui');

  // Device.validate('devEui', devEuiValidator, {
  //   message: 'Wrong devEui',
  // });

  Device.validatesUniquenessOf('name', { scopedTo: ['ownerId'] });

  // Device.validatesDateOf("lastSignal", {message: "lastSignal is not a date"});

  /**
   * Format packet and send it via MQTT broker
   * @method module:Device.publish
   * @param {object} device - Device instance
   * @param {string} method - MQTT method
   * @param {object} [client] - MQTT client target
   * @fires Server.publish
   */
  Device.publish = async (device, method, client) => {
    try {
      if (!device || !device.id || !device.ownerId) {
        throw utils.buildError(403, 'INVALID_DEVICE', 'Invalid device instance');
      }
      const packet = await iotAgent.publish({
        userId: device.ownerId,
        collection: collectionName,
        data: device,
        modelId: device.id,
        method: method || device.method,
        pattern: 'aloesClient',
      });
      if (packet && packet.topic && packet.payload) {
        if (client && client.id && client.devEui) {
          // todo : publish to client
          return null;
        }
        // if (client && (client.ownerId || client.appId)) {
        // }
        if (device.status) {
          // const nativePacket = { topic: `${device.devEui}-in/1/255/255/255`, payload: '1' };
          // if (nativePacket.payload && nativePacket.payload !== null) {
          //   await Device.app.publish(nativePacket.topic, nativePacket.payload, false, 0);
          // }
          //  console.log('nativePacket', nativePacket.topic);
        }
        if (device.appIds && device.appIds.length > 0) {
          const promises = await device.appIds.map(async appId => {
            try {
              const parts = packet.topic.split('/');
              parts[0] = appId;
              const topic = parts.join('/');
              Device.app.emit('publish', topic, packet.payload, false, 0);
              return topic;
            } catch (error) {
              throw error;
            }
          });
          await Promise.all(promises);
        }
        // await Device.app.publish(packet.topic, packet.payload, true, 1);
        Device.app.emit('publish', packet.topic, packet.payload, false, 0);
        logger.publish(4, `${collectionName}`, 'publish:res', {
          topic: packet.topic,
        });
        return device;
      }
      throw utils.buildError(403, 'INVALID_PACKET', 'Invalid MQTT Packet encoding');
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'publish:err', error);
      throw error;
    }
  };

  /**
   * Reset keys for this device instance
   * @method module:Device.prototype.resetKeys
   * @returns {object} this
   */
  Device.prototype.resetKeys = async function() {
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
   * Create new keys, and update Device instance
   * @method module:Device.refreshToken
   * @param {object} deviceId - Device instance id
   * @returns {object} device
   */
  Device.refreshToken = async (ctx, deviceId) => {
    try {
      logger.publish(4, `${collectionName}`, 'refreshToken:req', deviceId);
      if (!ctx.req.accessToken) throw utils.buildError(403, 'NO_TOKEN', 'User is not authentified');
      const device = await Device.findById(deviceId);
      if (device && device !== null) {
        if (ctx.req.accessToken.userId.toString() !== device.ownerId.toString()) {
          const error = utils.buildError(401, 'INVALID_OWNER', "User doesn't own this device");
          throw error;
        }
        // await device.resetKeys()
        const attributes = {
          clientKey: utils.generateKey('client'),
          apiKey: utils.generateKey('apiKey'),
          // restApiKey: utils.generateKey('restApi'),
          // javaScriptKey: utils.generateKey('javaScript'),
          // windowsKey: utils.generateKey('windows'),
          // masterKey: utils.generateKey('master'),
        };
        await device.updateAttributes(attributes);
        return device;
      }
      const error = utils.buildError(404, 'DEVICE_NOT_FOUND', "The device requested doesn't exist");
      throw error;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'refreshToken:err', error);
      throw error;
    }
  };

  /**
   * When POST or PUT method detected, update device instance
   * @method module:Sensor.createOrUpdate
   * @param {object} device - detected Device instance
   * @param {object} [client] - MQTT client
   * @returns {object} device
   */
  Device.createOrUpdate = async device => {
    try {
      logger.publish(4, `${collectionName}`, 'createOrUpdate:req', {
        deviceId: device.id,
        name: device.name,
      });
      if (!device || device === null) {
        const error = utils.buildError(403, 'INVALID_DEVICE', 'Invalid device input');
        throw error;
      }
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      if (device.id && (await Device.exists(device.id))) {
        const deviceId = device.id;
        delete device.id;
        device = await Device.replaceById(deviceId, device);
      } else {
        device = await Device.create(device);
      }
      return device;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'createOrUpdate:err', error);
      throw error;
    }
  };

  /**
   * Synchronize cache memory with database on disk
   * @method module:Device.syncCache
   * @param {string} [direction] - UP to save on disk | DOWN to save on cache,
   */
  Device.syncCache = async (direction = 'DOWN') => {
    try {
      logger.publish(5, `${collectionName}`, 'syncCache:req', direction);
      const devices = await Device.find();
      if (devices && devices !== null) {
        const promises = await devices.map(async device =>
          Device.app.models.SensorResource.syncCache(device, direction),
        );
        const result = await Promise.all(promises);
        return result;
      }
      return null;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Find device and / or sensor related to incoming MQTT packet
   * @method module:Device.findByPattern
   * @param {object} pattern - IotAgent parsed pattern
   * @param {object} attributes - IotAgent parsed message
   * @returns {object} device
   */
  Device.findByPattern = async (pattern, attributes) => {
    try {
      const params = pattern.params;
      const transportProtocol = attributes.transportProtocol || pattern.name;
      if (
        !transportProtocol ||
        !isLength(transportProtocol, { min: 4, max: 15 }) ||
        !isAlphanumeric(transportProtocol)
      ) {
        const error = utils.buildError(404, 'INVALID_INPUT', 'protocol name is invalid');
        throw error;
      }
      const transportProtocolFilter = {
        // eslint-disable-next-line security/detect-non-literal-regexp
        like: new RegExp(`.*${transportProtocol}.*`, 'i'),
      };
      // const messageProtocol = {
      //   like: new RegExp(`.*${pattern.name}.*`, 'i'),
      // };
      const deviceFilter = {
        where: {
          and: [{ transportProtocol: transportProtocolFilter }],
        },
        include: {
          relation: 'sensors',
          scope: {
            where: {
              and: [
                {
                  nativeSensorId: attributes.nativeSensorId,
                },
              ],
            },
            limit: 1,
          },
        },
      };
      if (attributes.type && attributes.type !== null) {
        deviceFilter.include.scope.where.and.push({
          type: attributes.type,
        });
      }
      if (attributes.nativeNodeId && attributes.nativeNodeId !== null) {
        deviceFilter.include.scope.where.and.push({
          nativeNodeId: attributes.nativeNodeId,
        });
      }
      // const sensorWhereFilter = await Sensor.buildWhere(attributes)
      if (params.appId && params.appId !== null) {
        deviceFilter.where.and.push({ appIds: { inq: [params.appId] } });
      }
      if (attributes.id && attributes.id !== null) {
        //  filter.where.and.push({ id: attributes.id });
      }
      if (attributes.deviceId && attributes.deviceId !== null) {
        deviceFilter.where.and.push({ id: attributes.deviceId });
      }
      if (attributes.devEui && attributes.devEui !== null) {
        deviceFilter.where.and.push({
          // eslint-disable-next-line security/detect-non-literal-regexp
          devEui: { like: new RegExp(`.*${attributes.devEui}.*`, 'i') },
        });
      }
      if (attributes.ownerId && attributes.ownerId !== null) {
        deviceFilter.include.scope.where.and.push({
          ownerId: attributes.ownerId,
        });
      }

      const device = await Device.findOne(deviceFilter);
      if (!device || device === null || !device.id) {
        const error = utils.buildError(
          404,
          'DEVICE_NOT_FOUND',
          "The device requested doesn't exist",
        );
        throw error;
      }
      // find equivalent sensor in cache
      logger.publish(4, `${collectionName}`, 'findByPattern:res', {
        deviceName: device.name,
        deviceId: device.id,
      });
      return device;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'findByPattern:err', error);
      throw error;
    }
  };

  /**
   * Search device by keywords ( name, address, type  )
   * @method module:Device.search
   * @param {object} filter - Requested filter
   * @returns {array} devices
   */
  Device.search = async filter => {
    logger.publish(4, `${collectionName}`, 'search:req', filter);
    try {
      if (
        !filter.text ||
        !isLength(filter.text, { min: 2, max: 30 }) ||
        !isAlphanumeric(filter.text)
      ) {
        const error = utils.buildError(400, 'INVALID_INPUT', 'Search filter is not valid');
        throw error;
      }

      filter.ownerType = 'Device';
      filter.public = true;
      /* eslint-disable security/detect-non-literal-regexp */
      const whereFilter = {
        or: [
          { name: { like: new RegExp(`.*${filter.text}.*`, 'i') } },
          { type: { like: new RegExp(`.*${filter.text}.*`, 'i') } },
          { fullAddress: { like: new RegExp(`.*${filter.text}.*`, 'i') } },
          { description: { like: new RegExp(`.*${filter.text}.*`, 'i') } },
          {
            transportProtocol: {
              like: new RegExp(`.*${filter.text}.*`, 'i'),
            },
          },
          // { devEui: { like: new RegExp(`.*${filter.text}.*`, 'i') } },
        ],
      };
      /* eslint-enable security/detect-non-literal-regexp */

      // if (filter.status !== undefined)
      let result = await Device.find({
        where: whereFilter,
        include: 'address',
        fields: {
          id: true,
          devEui: true,
          apiKey: true,
          clientKey: false,
          frameCounter: true,
          name: true,
          fullAddress: true,
          status: true,
          icons: true,
        },
      });

      if (!result || result === null) {
        result = [];
      }
      try {
        const address = await Device.app.models.Address.verify(filter.text);
        // console.log('address', address);
        if (address) {
          address.ownerType = filter.ownerType;
          // address.public = filter.public;
          const addresses = await Device.app.models.Address.search(address);
          if (addresses.length > 0) {
            const promises = await addresses.map(async addr =>
              Device.findOne({
                where: { id: addr.ownerId },
                include: 'address',
                // fields: {
                //   id: true,
                //   devEui: true,
                //   apiKey: false,
                //   clientKey: false,
                //   frameCounter: true,
                //   name: true,
                //   fullAddress: true,
                //   status: true,
                //   icons: true,
                // },
              }),
            );
            const moreDevices = await Promise.all(promises);
            if (moreDevices && moreDevices !== null) {
              result.forEach(dev => {
                const index = moreDevices.findIndex(d => d.id === dev.id);
                if (index > -1) {
                  moreDevices.splice(index, 1);
                }
              });
              result = [...moreDevices, ...result];
              // console.log('DEVICES 2', result);
            }
          }
        }
      } catch (error) {
        logger.publish(4, `${collectionName}`, 'search:res', 'no address found');
      }
      if (filter.limit && typeof filter.limit === 'number' && result.length > filter.limit) {
        result.splice(filter.limit, result.length - 1);
      }
      logger.publish(4, `${collectionName}`, 'search:res', result.length);
      return result;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'search:err', error);
      throw error;
    }
  };

  /**
   * Search devices by location ( GPS coordinates )
   * @method module:Device.geoLocate
   * @param {object} filter - Requested filter
   * @returns {array} devices
   */
  Device.geoLocate = async filter => {
    try {
      logger.publish(4, `${collectionName}`, 'geoLocate:req', filter);
      filter.ownerType = 'Device';
      // filter.public = true;
      const addresses = await Device.app.models.Address.geoLocate(filter);
      let devices = [];
      if (addresses.length > 0) {
        const promises = await addresses.map(async address =>
          Device.findOne({
            where: { id: address.ownerId },
            include: 'address',
            // fields: {
            //   id: true,
            //   devEui: true,
            //   apiKey: false,
            //   clientKey: false,
            //   frameCounter: true,
            //   name: true,
            //   fullAddress: true,
            //   status: true,
            //   icons: true,
            // },
          }),
        );
        devices = await Promise.all(promises);
      }
      if (filter.limit && typeof filter.limit === 'number' && devices.length > filter.limit) {
        devices.splice(filter.limit, devices.length - 1);
      }
      logger.publish(4, `${collectionName}`, 'geoLocate:res', devices.length);
      return devices;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'geoLocate:err', error);
      throw error;
    }
  };

  /**
   * Export devices list from JSON to {format}
   * @method module:Device.export
   * @param {array} devices
   * @param {string} [format]
   */
  Device.export = async (devices, filter, format = 'csv') => {
    if (!devices || devices.length < 1) return null;
    if (format === 'csv') {
      devices.forEach(device => {
        // eslint-disable-next-line security/detect-object-injection
        ['address', 'icons', 'sensors', 'collaborators', 'appIds'].forEach(p => delete device[p]);
      });
      const result = utils.exportToCSV(devices, filter);
      return result;
    }
    return null;
  };

  /**
   * Detect application known pattern and load the application instance
   * @method module:Application~detector
   * @param {object} packet - MQTT packet
   * @param {object} client - MQTT client
   * @returns {object} pattern
   */
  Device.detector = async (packet, client) => {
    try {
      //  if (packet.topic.startsWith('$SYS')) return null;
      if (packet.topic.split('/')[0] === '$SYS') return null;
      if (client && !client.ownerId && !client.devEui && !client.devAddr) return null;
      const pattern = await iotAgent.patternDetector(packet);
      logger.publish(5, collectionName, 'detector:res', { topic: packet.topic, pattern });
      return pattern;
    } catch (error) {
      logger.publish(2, collectionName, 'detector:err', error);
      return null;
    }
  };

  /**
   * Update device status from MQTT connection status
   * @method module:Device.updateStatus
   * @param {object} client - MQTT client
   * @param {boolean} status - MQTT connection status
   * @returns {function} device.updateAttributes
   */
  Device.updateStatus = async (client, status) => {
    try {
      if (!client || !client.id || !client.devEui) {
        throw new Error('Invalid client');
      }
      logger.publish(5, collectionName, 'updateStatus:req', status);
      const device = await Device.findById(client.user);
      if (device && device.devEui && device.devEui === client.devEui) {
        const Client = Device.app.models.Client;
        let ttl;
        let frameCounter = device.frameCounter;
        const clients = device.clients;
        const index = clients.indexOf(client.id);
        client.status = status;

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
          if (clients.length > 0) {
            status = true;
          } else {
            frameCounter = 0;
          }
          await Client.delete(client.id);
        }
        logger.publish(4, collectionName, 'updateStatus:res', client);
        await device.updateAttributes({
          frameCounter,
          status,
          // lastSignal: new Date(),
          clients,
        });
        return client;
      }
      // device not found
      return null;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'updateStatus:err', error);
      throw error;
    }
  };

  /**
   * Dispatch incoming MQTT packet
   * @method module:Device.onPublish
   * @param {object} packet - MQTT bridge packet
   * @param {object} pattern - Pattern detected by Iot-Agent
   * @param {object} client - MQTT client
   * @returns {function} Device~parseMessage
   */
  Device.onPublish = async (packet, pattern, client) => {
    try {
      logger.publish(4, `${collectionName}`, 'onPublish:req', pattern);
      if (!pattern || !pattern.params || !pattern.name || !client || !packet || !packet.topic) {
        const error = utils.buildError(403, 'INVALID_ARGS', 'Missing argument');
        throw error;
      }
      // limit access base on client props ?
      // logger.publish(4, `${collectionName}`, 'onPublish:res', pattern);
      return parseMessage(Device.app, packet, pattern, client);
    } catch (error) {
      // publish error to client
      logger.publish(2, `${collectionName}`, 'onPublish:err', error);
      throw error;
    }
  };

  /**
   * When device found, execute method extracted from MQTT topic
   * @param {object} device - found Device instance
   * @param {string} method - MQTT API method
   * @param {object} [client] - MQTT client target
   * @returns {object} device
   */
  Device.execute = async (device, method, client) => {
    try {
      logger.publish(4, collectionName, 'execute:req', method);
      switch (method.toUpperCase()) {
        case 'HEAD':
          await device.updateAttributes({
            frameCounter: device.frameCounter,
            status: true,
          });
          // todo set a scheduler to check if device is still online after 5 minutes ?
          break;
        case 'GET':
          //  device = await Device.findById(device.id);
          await Device.publish(device, 'GET', client);
          break;
        case 'POST':
          // if (!device.status && client && client.devEui === device.devEui {
          //   await device.updateAttributes({
          //     status: true,
          //     frameCounter: device.frameCounter + 1 || 1,
          //     lastSignal: attributes.lastSignal || new Date(),
          //   });
          // }
          device = await Device.createOrUpdate(device);
          break;
        case 'PUT':
          device = await Device.createOrUpdate(device);
          break;
        case 'STREAM':
          await Device.publish(device, 'STREAM', client);
          break;
        case 'DELETE':
          //  await Device.deleteById(device.id);
          break;
        case 'ERROR':
          break;
        default:
          throw new Error('Unsupported method');
      }
      return device;
    } catch (error) {
      // publish error to client
      throw error;
    }
  };

  /**
   * Endpoint for device authentification with APIKey
   *
   * @method module:Device.authenticate
   * @param {any} deviceId
   * @param {string} key
   * @returns {object} matched The matching device and key; one of:
   * - clientKey
   * - apiKey
   * - javaScriptKey
   * - restApiKey
   * - windowsKey
   * - masterKey
   */
  Device.authenticate = async (deviceId, key) => {
    try {
      const device = await Device.findById(deviceId);
      if (!device || !device.id) {
        const error = utils.buildError(404, 'DEVICE_NOTFOUND', 'Wrong device');
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
        if (device[k] && device[k] === key) {
          result = {
            device,
            keyType: k,
          };
        }
      });
      if (!result || !result.device || !result.keyType) {
        const error = utils.buildError(403, 'UNAUTHORIZED', 'Wrong key used');
        throw error;
      }
      logger.publish(4, `${collectionName}`, 'authenticate:res', result);
      return result;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'authenticate:err', error);
      throw error;
    }
  };

  /**
   * Endpoint for device requesting their own state ( small memory )
   * @method module:Device.getState
   * @param {string} deviceId - Device instance id
   * @returns {object}
   */
  Device.getState = async deviceId => {
    try {
      logger.publish(4, `${collectionName}`, 'getState:req', { deviceId });
      const resFilter = {
        fields: {
          id: true,
          devEui: true,
          apiKey: true,
          frameCounter: true,
          name: true,
          status: true,
        },
      };
      const device = await Device.findById(deviceId, resFilter);

      if (device && device !== null) {
        logger.publish(4, `${collectionName}`, 'getState:res', device);
        return device;
      }
      const error = utils.buildError(404, 'DEVICE_NOT_FOUND', "The device requested doesn't exist");
      throw error;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'getState:err', error);
      throw error;
    }
  };

  /**
   * Endpoint for device requesting their own state, including relations
   * @method module:Device.getFullState
   * @param {string} deviceId - Device instance id
   * @returns {object} device
   */
  Device.getFullState = async deviceId => {
    try {
      logger.publish(4, `${collectionName}`, 'getFullState:req', { deviceId });
      const resFilter = {
        // include: ['sensors', 'address'],
        include: ['address'],
        fields: {
          id: true,
          devEui: true,
          apiKey: true,
          name: true,
          status: true,
          description: true,
          frameCounter: true,
          icons: true,
          lastSignal: true,
          transportProtocol: true,
          transportProtocolVersion: true,
        },
      };
      const device = await Device.findById(deviceId, resFilter);

      if (device && device !== null && device.id) {
        logger.publish(4, `${collectionName}`, 'getFullState:res', device);
        const result = await Device.app.models.SensorResource.includeCache(
          JSON.parse(JSON.stringify(device)),
        );
        if (result && result.id) {
          return result;
        }
        return device;
      }
      const error = utils.buildError(404, 'DEVICE_NOT_FOUND', "The device requested doesn't exist");
      throw error;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'getFullState:err', error);
      throw error;
    }
  };

  /**
   * Update OTA if a firmware is available
   * @method module:Device.getOTAUpdate
   * @param {object} ctx - Loopback context
   * @param {string} deviceId - Device instance id
   * @param {string} [version] - Firmware version requested
   * @returns {function} Device~updateFirmware
   */
  Device.getOTAUpdate = async (ctx, deviceId, version) => updateFirmware(ctx, deviceId, version);

  const onSync = async data => {
    try {
      logger.publish(4, `${collectionName}`, 'onSync:res', data.time);
      const devices = await Device.syncCache('UP');
      return devices;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'onSync:err', error);
      return null;
    }
  };

  /**
   * Init clock to synchronize memories
   *
   * a DeltaTimer instance will be created and stored in memory
   * @method module:Device.setClock
   * @param {number} interval - Timeout interval
   * @returns {object} Device.timer
   */
  Device.setClock = async interval => {
    try {
      logger.publish(4, `${collectionName}`, 'setClock:req', interval);
      if (process.env.CLUSTER_MODE) {
        if (process.env.PROCESS_ID !== '0') return null;
        if (process.env.INSTANCES_PREFIX && process.env.INSTANCES_PREFIX !== '1') return null;
      }
      if (Device.timer && Device.timer !== null) {
        Device.timer.stop();
      }
      Device.timer = new DeltaTimer(onSync, {}, interval);
      Device.start = Device.timer.start();
      logger.publish(3, `${collectionName}`, 'setClock:res', Device.start);
      return Device.timer;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'setClock:err', error);
      return null;
    }
  };

  Device.delClock = () => {
    if (Device.timer) Device.timer.stop();
  };

  /**
   * Event reporting that an device client connection status has changed.
   * @event client
   * @param {object} message - Parsed MQTT message.
   * @property {object} message.client - MQTT client
   * @property {boolean} message.status - MQTT client status.
   * @returns {function} Device.updateStatus
   */
  Device.on('client', async message => {
    try {
      logger.publish(2, `${collectionName}`, 'on-client:req', Object.keys(message));
      if (!message || message === null) throw new Error('Message empty');
      const status = message.status;
      const client = message.client;
      if (!client || !client.user || status === undefined) {
        throw new Error('Message missing properties');
      }
      return Device.updateStatus(client, status);
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'on-client:err', error);
      return null;
    }
  });

  /**
   * Event reporting that a device client sent a message.
   * @event publish
   * @param {object} message - Parsed MQTT message.
   * @property {object} message.packet - MQTT packet.
   * @property {object} message.pattern - Pattern detected by Iot-Agent
   * @property {object} message.device - Found Device instance
   * @property {object}[message.client] - MQTT client
   * @returns {functions} Device.execute
   * @returns {functions} Device.onPublish
   */
  Device.on('publish', async message => {
    try {
      if (!message || message === null) throw new Error('Message empty');
      const packet = message.packet;
      const client = message.client;
      const pattern = message.pattern;
      const device = message.device;
      logger.publish(4, collectionName, 'on-publish:req', pattern.name);
      if (!pattern) throw new Error('Message is missing pattern');
      if (device && device !== null) {
        await Device.execute(device, pattern.params.method, client);
      } else if (packet) {
        await Device.onPublish(packet, pattern, client);
      }
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'on-publish:err', error);
    }
  });

  // Device.once('started', () => setTimeout(() => Device.setClock(clockInterval), 2500));

  Device.on('stopped', async () => {
    try {
      if (process.env.CLUSTER_MODE) {
        if (process.env.PROCESS_ID !== '0') return null;
        if (process.env.INSTANCES_PREFIX && process.env.INSTANCES_PREFIX !== '1') return null;
      }
      logger.publish(3, `${collectionName}`, 'on-stop:res', '');
      Device.delClock();
      // await Device.updateAll({ status: true }, { status: false, clients: [] });
      return Device.syncCache('UP');
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'on-stop:err', error);
      return null;
    }
  });

  /**
   * Event reporting that a device instance will be created or updated.
   * @event before_save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Device instance
   * @returns {function} Device~onBeforeSave
   */
  Device.observe('before save', onBeforeSave);

  /**
   * Event reporting that a device instance has been created or updated.
   * @event after_save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Device instance
   * @returns {function} Device~onAfterSave
   */
  Device.observe('after save', onAfterSave);

  /**
   * Event reporting that one or several device instance(s) will be deleted.
   * @event before_delete
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.where.id - Device instance
   * @returns {function} Device~onBeforeDelete
   */
  Device.observe('before delete', onBeforeDelete);

  /**
   * Event reporting that a device instance / collection is requested
   * @event before_*
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @returns {function} Device~onBeforeRemote
   */
  Device.beforeRemote('**', async ctx => onBeforeRemote(Device.app, ctx));

  Device.afterRemoteError('*', (ctx, next) => {
    logger.publish(2, `${collectionName}`, `after ${ctx.methodString}:err`, '');
    // publish on collectionName/ERROR
    next();
  });

  /**
   * Find devices
   * @method module:Device.find
   * @param {object} filter
   * @returns {object}
   */

  /**
   * Returns devices length
   * @method module:Device.count
   * @param {object} where
   * @returns {number}
   */

  /**
   * Find device by id
   * @method module:Device.findById
   * @param {any} id
   * @param {object} filter
   * @returns {object}
   */

  /**
   * Create device
   * @method module:Device.create
   * @param {object} device
   * @returns {object}
   */

  /**
   * Update device by id
   * @method module:Device.updateById
   * @param {any} id
   * @param {object} filter
   * @returns {object}
   */

  /**
   * Delete device by id
   * @method module:Device.deleteById
   * @param {any} id
   * @param {object} filter
   * @returns {object}
   */

  Device.disableRemoteMethodByName('upsertWithWhere');
  Device.disableRemoteMethodByName('replaceOrCreate');
  Device.disableRemoteMethodByName('createChangeStream');

  Device.disableRemoteMethodByName('prototype.__create__sensors');
  Device.disableRemoteMethodByName('prototype.__updateById__sensors');
  Device.disableRemoteMethodByName('prototype.__delete__sensors');
  Device.disableRemoteMethodByName('prototype.__destroyById__sensors');
  Device.disableRemoteMethodByName('prototype.__deleteById__sensors');
  Device.disableRemoteMethodByName('prototype.__link__sensors');
  Device.disableRemoteMethodByName('prototype.__unlink__sensors');

  Device.disableRemoteMethodByName('prototype.__link__collaborators');
  Device.disableRemoteMethodByName('prototype.__unlink__collaborators');
};
