/* Copyright 2020 Edouard Maleix, read LICENSE */

import { createHash } from 'crypto';
import iotAgent from 'iot-agent';
import isMACAddress from 'validator/lib/isMACAddress';
import logger from '../../services/logger';
import deviceTypes from '../../initial-data/device-types.json';
import protocols from '../../initial-data/protocols.json';
import utils from '../utils';

export const collectionName = 'Device';

const filteredProperties = ['children', 'size', 'show', 'group', 'success', 'error'];

/**
 * Error callback
 * @callback module:Device~errorCallback
 * @param {error} ErrorObject
 */

/**
 * Validate device transportProtocol before saving instance
 * @method module:Device~transportProtocolValidator
 * @param {ErrorCallback} err
 */
export function transportProtocolValidator(err) {
  if (
    !this.transportProtocol ||
    !protocols.transport.some(p => p.toLowerCase() === this.transportProtocol.toLowerCase())
  ) {
    err();
  }
}

/**
 * Validate device messageProtocol before saving instance
 * @method module:Device~messageProtocolValidator
 * @param {ErrorCallback} err
 */
export function messageProtocolValidator(err) {
  if (
    !this.messageProtocol ||
    !protocols.message.some(p => p.toLowerCase() === this.messageProtocol.toLowerCase())
  ) {
    err();
  }
}

/**
 * Validate device type before saving instance
 * @method module:Device~typeValidator
 * @param {ErrorCallback} err
 */
export function typeValidator(err) {
  // eslint-disable-next-line security/detect-object-injection
  if (!this.type || !deviceTypes[this.type]) {
    err();
  }
}

// export function devEuiValidator(err) {
//   if (!this.devEui || !isHexadecimal(this.devEui)) {
//     err();
//   }
// }
/**
 * Set device icons ( urls ) based on its type
 * @method module:Device~setDeviceIcons
 * @param {object} device - Device instance
 * @returns {object} device
 */
const setDeviceIcons = device => {
  if (device.type && deviceTypes[device.type]) {
    device.icons[0] = deviceTypes[device.type].icons[0];
    device.icons[1] = deviceTypes[device.type].icons[1];
  }
  return device;
};

/**
 * Keys creation helper - update device attributes
 * @method module:Device~createKeys
 * @param {object} device - Device instance
 * @returns {Promise<object>} device
 */
const createKeys = async device => {
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
};

/**
 * Set device QRcode access based on declared protocol and access point url
 * @method module:Device~setDeviceQRCode
 * @param {object} device - Device instance
 * @returns {object} device
 */
const setDeviceQRCode = device => {
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
};

/**
 * Check if a Device instance is attached to any Application instance
 *
 * Publish message to each of these Application instance
 * @method module:Device~publishToDeviceApplications
 * @param {object} app - Loopback app
 * @param {object} device - Device instance
 * @param {object} packet - MQTT packet to send
 * @fires Server.publish
 */
export const publishToDeviceApplications = (app, device, packet) => {
  if (device.appIds && device.appIds.length > 0) {
    device.appIds.map(appId => {
      const parts = packet.topic.split('/');
      parts[0] = appId;
      const topic = parts.join('/');
      return app.emit('publish', topic, packet.payload, false, 0);
    });
    // await Promise.all(promises);
  }
};

/**
 * Validate instance before creation
 * @async
 * @method module:Device~onBeforeSave
 * @param {object} ctx - Loopback context
 * @returns {Promise<object>} ctx
 */
export const onBeforeSave = async ctx => {
  if (ctx.options && ctx.options.skipPropertyFilter) return ctx;
  if (ctx.instance) {
    logger.publish(4, `${collectionName}`, 'onBeforeSave:req', ctx.instance);
    await Promise.all(filteredProperties.map(async prop => ctx.instance.unsetAttribute(prop)));
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
    // if (ctx.where && ctx.where.id && !ctx.where.id.inq) {
    //   const device = await ctx.Model.findById(ctx.where.id);
    //   await setDeviceIcons(device);
    // } else {
    //   const devices = await ctx.Model.find({ where: ctx.where });
    //   if (devices && devices.length > 0) {
    //     await Promise.all(
    //       devices.map(setDeviceIcons),
    //     );
    //   }
    // }
    // eslint-disable-next-line security/detect-object-injection
    filteredProperties.forEach(p => delete ctx.data[p]);
    ctx.hookState.updateData = ctx.data;
    return ctx;
  }
  // else if (ctx.currentInstance) {
  //   device = ctx.currentInstance;
  // }
  return ctx;
};

/**
 * Init device dependencies ( token, address )
 * @method module:Device~createProps
 * @param {object} app - Loopback app
 * @param {object} instance - Device instance
 * @returns {Promise<function>} Device.publish
 */
const createProps = async (app, instance) => {
  await instance.address.create({
    street: '',
    streetNumber: null,
    streetName: null,
    postalCode: null,
    city: null,
    public: false,
  });
  instance = await createKeys(instance);
  // todo create a sensor 3310 to report event and request network load ?
  if (!instance.address() || !instance.apiKey) {
    await app.models.Device.destroyById(instance.id);
    // await instance.destroy()
    throw new Error('no device address');
  }
  instance.createdAt = new Date();
  return app.models.Device.publish(instance, 'POST');
};

/**
 * Update device depencies ( token, sensors )
 * @method module:Device~updateProps
 * @param {object} app - Loopback app
 * @param {object} instance - Device instance
 * @returns {Promise<function>} Device.publish
 */
const updateProps = async (app, instance) => {
  await createKeys(instance);
  const sensors = await instance.sensors.find();

  if (sensors) {
    await Promise.all(
      sensors.map(async sensor => {
        sensor.updateAttributes({
          ...sensor,
          devEui: instance.devEui,
          transportProtocol: instance.transportProtocol,
          transportProtocolVersion: instance.transportProtocolVersion,
          messageProtocol: instance.messageProtocol,
          messageProtocolVersion: instance.messageProtocolVersion,
        });
      }),
    );
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
};

/**
 * Create relations on instance creation
 * @method module:Device~onAfterSave
 * @param {object} ctx - Loopback context
 * @returns {Promise<object>} ctx
 */
export const onAfterSave = async ctx => {
  if (ctx.hookState.updateData) {
    logger.publish(4, `${collectionName}`, 'onAfterPartialSave:req', ctx.hookState.updateData);
    const updatedProps = Object.keys(ctx.hookState.updateData);
    if (updatedProps.some(prop => prop === 'status')) {
      // todo : if (ctx.where) update all ctx.where
      if (ctx.instance && ctx.instance.id) await ctx.Model.publish(ctx.instance, 'HEAD');
    }
  } else if (ctx.instance && ctx.Model.app) {
    logger.publish(4, `${collectionName}`, 'onAfterSave:req', ctx.instance);
    if (ctx.isNewInstance) {
      await createProps(ctx.Model.app, ctx.instance);
    } else {
      await updateProps(ctx.Model.app, ctx.instance);
    }
  }
  return ctx;
};

/**
 * Remove device dependencies
 * @method module:Device~deleteProps
 * @param {object} app - Loopback app
 * @param {object} instance
 * @returns {Promise<boolean>}
 */
const deleteProps = async (app, instance) => {
  try {
    if (instance && instance.id && instance.ownerId) {
      logger.publish(4, `${collectionName}`, 'deleteProps:req', instance);
      await app.models.Address.destroyAll({
        ownerId: instance.id,
      });
      const sensors = await instance.sensors.find();
      if (sensors && sensors !== null) {
        await Promise.all(sensors.map(async sensor => sensor.delete()));
      }
      await app.models.Device.publish(instance, 'DELETE');
    }
    return true;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'deleteProps:err', error);
    return false;
  }
};

/**
 * Delete relations on instance(s) deletetion
 * @method module:Device~onBeforeDelete
 * @param {object} ctx - Loopback context
 * @returns {Promise<object>} ctx
 */
export const onBeforeDelete = async ctx => {
  logger.publish(4, `${collectionName}`, 'onBeforeDelete:req', ctx.where);
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
};

/**
 * Called when a remote method tries to access Device Model / instance
 * @method module:Device~onBeforeRemote
 * @param {object} app - Loopback App
 * @param {object} ctx - Express context
 * @param {object} ctx.req - Request
 * @param {object} ctx.res - Response
 * @returns {Promise<object>} context
 */
export const onBeforeRemote = async (app, ctx) => {
  if (
    ctx.method.name.indexOf('find') !== -1 ||
    ctx.method.name.indexOf('__get') !== -1 ||
    ctx.method.name === 'get'
    // count
    // ctx.method.name.indexOf('get') !== -1
  ) {
    const options = ctx.options || {};
    const isAdmin = options.currentUser.roles.includes('admin');
    const ownerId = utils.getOwnerId(options);
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
    // console.log('[DEVICE] beforeRemote get:req', ctx.method.name, ctx.req.params, ctx.req.query);

    // const result = await appendCachedSensors(app, ctx);
    // if (result && result !== null) {
    //   ctx.result = result;
    // }
  } else if (ctx.method.name === 'search' || ctx.method.name === 'geoLocate') {
    const options = ctx.options || {};
    const isAdmin = options.currentUser.roles.includes('admin');
    if (!isAdmin) {
      if (!ctx.args.filter) ctx.args.filter = {};
      ctx.args.filter.ownerId = options.currentUser.id.toString();
      ctx.args.filter.ownerType = options.currentUser.type;
      // ctx.args.filter.public = true;
    }
  } else if (ctx.method.name === 'findByPattern') {
    const options = ctx.options || {};
    const isAdmin = options.currentUser.roles.includes('admin');
    const ownerId = utils.getOwnerId(options);
    if (!isAdmin) {
      if (!ctx.args.attributes) ctx.args.attributes = {};
      ctx.args.attributes.ownerId = ownerId;
    }
  } else if (ctx.method.name === 'refreshToken') {
    const options = ctx.options || {};
    ctx.args.ownerId = utils.getOwnerId(options);
  } else if (ctx.method.name === 'onPublish' || ctx.method.name === 'updateStatus') {
    const options = ctx.options || {};
    const isAdmin = options.currentUser.roles.includes('admin');
    if (!ctx.args.client) ctx.args.client = {};
    if (!isAdmin) {
      ctx.args.client.user = options.currentUser.id;
      if (options.currentUser.devEui) {
        ctx.args.client.devEui = options.currentUser.devEui;
      }
    }
  } else if (ctx.method.name === 'getState' || ctx.method.name === 'getFullState') {
    const options = ctx.options || {};
    // console.log('before remote', ctx.method.name, options.currentUser, ctx.args.deviceId);
    const isAdmin = options.currentUser.roles.includes('admin');
    if (!isAdmin && options.currentUser.devEui) {
      if (options.currentUser.id.toString() !== ctx.args.deviceId.toString()) {
        throw utils.buildError(401, 'INVALID_USER', 'Only device itself can trigger this endpoint');
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
 * @method module:Device~parseMessage
 * @param {object} app - Loopback app
 * @param {object} packet - MQTT packet
 * @param {object} pattern - Pattern detected by IotAgent
 * @param {object} client - MQTT client
 * @fires Device.publish
 * @fires Sensor.publish
 * @returns {Promise<object>} device
 */
export const parseMessage = async (app, packet, pattern, client) => {
  if (!pattern || !pattern.params || !packet || !packet.topic) {
    throw utils.buildError(403, 'INVALID_ARGS', 'Missing pattern and / or packet');
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
  logger.publish(5, `${collectionName}`, 'parseMessage:attributes', attributes);

  if (attributes.devEui && attributes.nativeSensorId && (attributes.type || attributes.resource)) {
    logger.publish(4, `${collectionName}`, 'parseMessage:redirect to Sensor', {
      nativeSensorId: attributes.nativeSensorId,
      nativeNodeId: attributes.nativeNodeId,
    });
    const device = await Device.findByPattern(pattern, attributes);

    app.models.Sensor.emit('publish', {
      device,
      pattern,
      sensor: device.sensors[0],
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
    // try {
    // } catch (e) {
    //   device = null;
    // }
    device = attributes.id
      ? await Device.findById(attributes.id)
      : await Device.findByPattern(pattern, attributes);

    device = JSON.parse(JSON.stringify(device));
    device = { ...device, ...attributes };
    Device.emit('publish', { device, pattern, client });
    return device;
  }

  throw utils.buildError(400, 'DECODING_ERROR', 'No attributes retrieved from Iot Agent');
};

const checkHeader = (headers, key, value = false) => {
  // eslint-disable-next-line security/detect-object-injection
  if (!headers || !headers[key] || (value && headers[key] !== value)) {
    return false;
  }
  return true;
};

const updateESP = async (ctx, deviceId, version) => {
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
    throw utils.buildError(403, 'INVALID_OTA_HEADER', 'invalid ESP8266 header');
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
  const md5sum = createHash('md5');

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
};

export const updateFirmware = async (ctx, deviceId, version) => {
  if (checkHeader(ctx.req.headers, 'user-agent', 'ESP8266-http-Update')) {
    return updateESP(ctx, deviceId, version);
  }
  throw utils.buildError(403, 'WRONG_TARGET', 'only for ESP8266 updater');
};
