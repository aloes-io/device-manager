/* Copyright 2020 Edouard Maleix, read LICENSE */

// import { timingSafeEqual } from 'crypto';
import iotAgent from 'iot-agent';
import isAlphanumeric from 'validator/lib/isAlphanumeric';
import isLength from 'validator/lib/isLength';
import {
  collectionName,
  onBeforeRemote,
  onAfterSave,
  onBeforeSave,
  onBeforeDelete,
  parseMessage,
  publishToDeviceApplications,
  updateFirmware,
  messageProtocolValidator,
  transportProtocolValidator,
  typeValidator,
  deviceError,
  patternDetector,
} from '../lib/models/device';
import { getResources } from '../lib/models/sensor';
import logger from '../services/logger';
import utils from '../lib/utils';

// todo document device instance functions : address, userIds, appIds

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

// const clockInterval = 5 * 60 * 1000;

module.exports = function (Device) {
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

  Device.validatesDateOf('createdAt', { message: 'createdAt is not a date' });

  // Device.validatesDateOf("lastSignal", {message: "lastSignal is not a date"});

  /**
   * Format packet and send it via MQTT broker
   * @async
   * @method module:Device.publish
   * @param {object} device - Device instance
   * @param {string} method - MQTT method
   * @param {object} [client] - MQTT client target
   * @fires Server.publish
   * @returns {Promise<object | null>} device
   */
  Device.publish = async (device, method, client) => {
    if (!device || !device.id || !device.ownerId) {
      return deviceError(400, 'INVALID_DEVICE', 'Invalid device instance');
    }
    const packet = iotAgent.publish({
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
      publishToDeviceApplications(Device.app, device, packet);
      Device.app.emit('publish', packet.topic, packet.payload, false, 0);
      logger.publish(4, `${collectionName}`, 'publish:res', {
        topic: packet.topic,
      });
      return device;
    }
    return deviceError(400, 'INVALID_PACKET', 'Invalid MQTT Packet encoding');
  };

  /**
   * Create new keys, and update Device instance
   * @method module:Device.refreshToken
   * @param {object} deviceId - Device instance id
   * @param {object} ownerId - Device owner id
   * @returns {Promise<object>} device
   */
  Device.refreshToken = async (deviceId, ownerId) => {
    logger.publish(4, `${collectionName}`, 'refreshToken:req', { deviceId, ownerId });
    let device = await utils.findById(Device, deviceId);
    if (ownerId !== device.ownerId.toString()) {
      throw utils.buildError(401, 'INVALID_OWNER', "User doesn't own this device");
    }
    if (device && device !== null) {
      device = await utils.updateAttributes(device, {
        clientKey: utils.generateKey('client'),
        apiKey: utils.generateKey('apiKey'),
        // restApiKey: utils.generateKey('restApi'),
        // javaScriptKey: utils.generateKey('javaScript'),
        // windowsKey: utils.generateKey('windows'),
        // masterKey: utils.generateKey('master'),
      });
      return device;
    }
    throw utils.buildError(403, 'DEVICE_NOT_FOUND', "The device requested doesn't exist");
  };

  /**
   * When POST or PUT method detected, update device instance
   * @method module:Sensor.createOrUpdate
   * @param {object} device - detected Device instance
   * @param {object} [client] - MQTT client
   * @returns {Promise<object>} device
   */
  Device.createOrUpdate = async (device) => {
    logger.publish(4, `${collectionName}`, 'createOrUpdate:req', {
      deviceId: device.id,
      name: device.name,
    });
    if (!device || device === null) {
      throw utils.buildError(403, 'INVALID_DEVICE', 'Invalid device input');
    }
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (device.id && (await Device.exists(device.id))) {
      const deviceId = device.id;
      delete device.id;
      device = await Device.replaceById(deviceId, device);
    } else {
      device = await utils.create(Device, device);
    }
    return device;
  };

  /**
   * Find device and / or sensor related to incoming MQTT packet
   * @method module:Device.findByPattern
   * @param {object} pattern - IotAgent parsed pattern
   * @param {object} attributes - IotAgent parsed message
   * @returns {Promise<object>} device
   */
  Device.findByPattern = async (pattern, attributes) => {
    const params = pattern.params;
    const transportProtocol = attributes.transportProtocol || pattern.name;
    if (
      !transportProtocol ||
      !isLength(transportProtocol, { min: 4, max: 15 }) ||
      !isAlphanumeric(transportProtocol)
    ) {
      throw utils.buildError(400, 'INVALID_INPUT', 'protocol name is invalid');
    }

    // const messageProtocol = {
    //   like: new RegExp(`.*${pattern.name}.*`, 'i'),
    // };
    // logger.publish(3, `${collectionName}`, 'findByPattern:req', { attributes });

    const deviceFilter = {
      where: {
        and: [
          {
            transportProtocol: {
              // eslint-disable-next-line security/detect-non-literal-regexp
              like: new RegExp(`.*${transportProtocol}.*`, 'i'),
            },
          },
        ],
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
    // if (attributes.id && attributes.id !== null) {
    //   filter.where.and.push({ id: attributes.id });
    // }
    if (attributes.deviceId && attributes.deviceId !== null) {
      deviceFilter.where.and.push({ id: attributes.deviceId });
    }
    if (attributes.devEui && attributes.devEui !== null) {
      deviceFilter.where.and.push({
        // eslint-disable-next-line security/detect-non-literal-regexp
        devEui: { like: new RegExp(`.*${attributes.devEui}.*`, 'i') },
      });
    }
    // if (attributes.ownerId && attributes.ownerId !== null) {
    //   deviceFilter.include.scope.where.and.push({
    //     ownerId: attributes.ownerId,
    //   });
    // }
    // logger.publish(2, `${collectionName}`, 'findByPattern:filter', deviceFilter);

    const device = await utils.findOne(Device, deviceFilter);
    if (!device || !device.id) {
      throw utils.buildError(403, 'DEVICE_NOT_FOUND', "The device requested doesn't exist");
    }

    logger.publish(4, `${collectionName}`, 'findByPattern:res', {
      deviceName: device.name,
      deviceId: device.id,
      sensor: device.sensors() && device.sensors()[0],
    });
    return device;
  };

  /**
   * Search device by keywords ( name, address, type  )
   * @method module:Device.search
   * @param {object} filter - Requested filter
   * @returns {Promise<array>} devices
   */
  Device.search = async (filter) => {
    logger.publish(4, `${collectionName}`, 'search:req', filter);
    if (
      !filter.text ||
      !isLength(filter.text, { min: 2, max: 30 }) ||
      !isAlphanumeric(filter.text)
    ) {
      return deviceError(400, 'INVALID_INPUT', 'Search filter is not valid');
    }

    filter.ownerType = 'Device';
    filter.public = true;
    // todo add limit

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
    let result =
      (await utils.find(Device, {
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
      })) || [];

    try {
      const address = await Device.app.models.Address.verify(filter.text);
      address.ownerType = filter.ownerType;
      // address.public = filter.public;
      const addresses = await Device.app.models.Address.search(address);
      if (addresses.length > 0) {
        const moreDevices = await Promise.all(
          addresses.map(async (addr) =>
            utils.findOne(Device, {
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
          ),
        );
        if (moreDevices && moreDevices !== null) {
          result.forEach((dev) => {
            const index = moreDevices.findIndex((d) => d.id === dev.id);
            if (index > -1) {
              moreDevices.splice(index, 1);
            }
          });
          result = [...moreDevices, ...result];
        }
      }
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'search:err', error);
    }
    if (filter.limit && typeof filter.limit === 'number' && result.length > filter.limit) {
      result.splice(filter.limit, result.length - 1);
    }
    logger.publish(4, `${collectionName}`, 'search:res', result.length);
    return result;
  };

  /**
   * Search devices by location ( GPS coordinates )
   * @method module:Device.geoLocate
   * @param {object} filter - Requested filter
   * @returns {Promise<array>} devices
   */
  Device.geoLocate = async (filter) => {
    logger.publish(4, `${collectionName}`, 'geoLocate:req', filter);
    filter.ownerType = 'Device';
    // filter.public = true;
    const addresses = await Device.app.models.Address.geoLocate(filter);
    let devices = [];
    if (addresses.length > 0) {
      devices = await Promise.all(
        addresses.map(async (address) =>
          utils.findOne(Device, {
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
        ),
      );
    }
    if (filter.limit && typeof filter.limit === 'number' && devices.length > filter.limit) {
      devices.splice(filter.limit, devices.length - 1);
    }
    logger.publish(4, `${collectionName}`, 'geoLocate:res', devices.length);
    return devices;
  };

  /**
   * Export devices list from JSON to {format}
   * @method module:Device.export
   * @param {array} devices
   * @param {string} [format]
   * @returns {Promise<string | null>}
   */
  Device.export = async (devices, filter, format = 'csv') => {
    if (!devices || !devices.length) return null;
    if (format === 'csv') {
      devices.forEach((device) => {
        // eslint-disable-next-line security/detect-object-injection
        ['address', 'icons', 'sensors', 'collaborators', 'appIds'].forEach((p) => delete device[p]);
      });
      const result = utils.exportToCSV(devices, filter);
      return result;
    }
    return null;
  };

  /**
   * Detect device known pattern and load the application instance
   * @method module:Device~detector
   * @param {object} packet - MQTT packet
   * @param {object} client - MQTT client
   * @returns {object | null} pattern
   */
  Device.detector = (packet, client) => patternDetector(packet, client);

  /**
   * Update device status from MQTT connection status
   * @method module:Device.updateStatus
   * @param {object} client - MQTT client
   * @param {boolean} status - MQTT connection status
   * @returns {Promise<function>} device.updateAttributes
   */
  Device.updateStatus = async (client, status) => {
    // if (!client || !client.id || !client.devEui) {
    //   throw new Error('Invalid client');
    // }
    logger.publish(4, collectionName, 'updateStatus:req', status);
    let device = await utils.findById(Device, client.user);
    if (!device) {
      return null;
    }
    const Client = Device.app.models.Client;
    let frameCounter = device.frameCounter;
    const clients = device.clients || [];
    const index = clients.indexOf(client.id);
    client.status = status;

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
    logger.publish(3, collectionName, 'updateStatus:res', client);
    device = await utils.updateAttributes(device, {
      frameCounter,
      status,
      lastSignal: Date.now(),
      clients,
    });
    return device;
  };

  /**
   * Dispatch incoming MQTT packet
   * @method module:Device.onPublish
   * @param {object} packet - MQTT bridge packet
   * @param {object} pattern - Pattern detected by Iot-Agent
   * @param {object} client - MQTT client
   * @returns {Promise<function>} Device~parseMessage
   */
  Device.onPublish = async (packet, pattern, client) => {
    logger.publish(4, `${collectionName}`, 'onPublish:req', pattern);
    if (!pattern || !pattern.params || !pattern.name || !client || !packet || !packet.topic) {
      throw utils.buildError(403, 'INVALID_ARGS', 'Missing argument');
    }
    // limit access base on client props ?
    // logger.publish(4, `${collectionName}`, 'onPublish:res', pattern);
    return parseMessage(Device.app, packet, pattern, client);
  };

  /**
   * When device found, execute method extracted from MQTT topic
   * @param {object} device - found Device instance
   * @param {string} method - MQTT API method
   * @param {object} [client] - MQTT client target
   * @returns {Promise<object>} device
   */
  Device.execute = async (device, method, client) => {
    logger.publish(4, collectionName, 'execute:req', method);
    switch (method.toUpperCase()) {
      case 'HEAD':
        device = await utils.updateAttributes(device, {
          frameCounter: device.frameCounter,
          status: true,
        });
        break;
      case 'GET':
        device = await utils.findById(Device, device.id);
        await Device.publish(device, 'GET', client);
        break;
      case 'POST':
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
  };

  /**
   * Endpoint for device authentification with APIKey
   *
   * @method module:Device.authenticate
   * @param {any} deviceId
   * @param {string} key
   * @returns {Promise<object>} matched The matching device and key; one of:
   * - clientKey
   * - apiKey
   * - javaScriptKey
   * - restApiKey
   * - windowsKey
   * - masterKey
   */
  Device.authenticate = async (deviceId, key) => {
    const device = await utils.findById(Device, deviceId);
    if (!device || !device.id) {
      throw utils.buildError(404, 'DEVICE_NOTFOUND', 'Wrong device');
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

    keyNames.forEach((k) => {
      // const isValid = timingSafeEqual(Buffer.from(device[k]), Buffer.from(key));
      // eslint-disable-next-line security/detect-object-injection
      const isValid = device[k] === key;
      if (isValid) {
        result = {
          device,
          keyType: k,
        };
      }
    });
    if (!result || !result.device || !result.keyType) {
      throw utils.buildError(403, 'UNAUTHORIZED', 'Wrong key used');
    }
    logger.publish(4, `${collectionName}`, 'authenticate:res', result);
    return result;
  };

  /**
   * Endpoint for device requesting their own state ( small memory )
   * @method module:Device.getState
   * @param {string} deviceId - Device instance id
   * @returns {Promise<object>} device
   */
  Device.getState = async (deviceId) => {
    logger.publish(4, `${collectionName}`, 'getState:req', { deviceId });
    const device = await utils.findById(Device, deviceId, {
      fields: {
        id: true,
        devEui: true,
        apiKey: true,
        frameCounter: true,
        name: true,
        status: true,
      },
    });
    if (!device || !device.id) {
      throw utils.buildError(404, 'DEVICE_NOT_FOUND', "The device requested doesn't exist");
    }
    logger.publish(4, `${collectionName}`, 'getState:res', device);
    return device;
  };

  /**
   * Endpoint for device requesting their own state, including relations
   * @method module:Device.getFullState
   * @param {string} deviceId - Device instance id
   * @returns {Promise<object>} device
   */
  Device.getFullState = async (deviceId) => {
    logger.publish(4, `${collectionName}`, 'getFullState:req', { deviceId });
    const resFilter = {
      include: ['sensors', 'address'],
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
    let device = await utils.findById(Device, deviceId, resFilter);
    if (!device || !device.id) {
      throw utils.buildError(404, 'DEVICE_NOT_FOUND', "The device requested doesn't exist");
    }

    if (device.sensors()) {
      const sensors = await Promise.all(
        device.sensors().map(async (sensor) => ({
          ...sensor,
          resources: await getResources(sensor),
        })),
      );
      device = JSON.parse(JSON.stringify(device));
      device.sensors = sensors;
    }
    logger.publish(4, `${collectionName}`, 'getFullState:res', device);
    return device;
  };

  /**
   * Update OTA if a firmware is available
   * @method module:Device.getOTAUpdate
   * @param {object} ctx - Loopback context
   * @param {string} deviceId - Device instance id
   * @param {string} [version] - Firmware version requested
   * @returns {Promise<function>} Device~updateFirmware
   */
  Device.getOTAUpdate = async (ctx, deviceId, version) => updateFirmware(ctx, deviceId, version);

  /**
   * Event reporting that an device client connection status has changed.
   * @event client
   * @param {object} message - Parsed MQTT message.
   * @property {object} message.client - MQTT client
   * @property {boolean} message.status - MQTT client status.
   * @returns {Promise<function | null>} Device.updateStatus
   */
  Device.on('client', async (message) => {
    logger.publish(4, `${collectionName}`, 'on-client:req', Object.keys(message));
    // if (!message || message === null) throw new Error('Message empty');
    const { client, status } = message;
    if (!client || !client.user || status === undefined) {
      // throw new Error('Message missing properties');
      return null;
    }
    return Device.updateStatus(client, status);
  });

  /**
   * Event reporting that a device client sent a message.
   * @event publish
   * @param {object} message - Parsed MQTT message.
   * @property {object} message.packet - MQTT packet.
   * @property {object} message.pattern - Pattern detected by Iot-Agent
   * @property {object} message.device - Found Device instance
   * @property {object}[message.client] - MQTT client
   * @returns {Promise<functions | null>} Device.onPublish | Device.execute
   */
  Device.on('publish', async (message) => {
    try {
      if (!message || message === null) throw new Error('Message empty');
      const { client, device, packet, pattern } = message;
      logger.publish(4, collectionName, 'on-publish:req', pattern.name);
      if (!pattern) throw new Error('Message is missing pattern');
      if (device && device !== null) {
        return Device.execute(device, pattern.params.method, client);
      } else if (packet) {
        return Device.onPublish(packet, pattern, client);
      }
      return null;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'on-publish:err', error);
      return null;
    }
  });

  /**
   * Event reporting that application stopped
   *
   * Trigger Device stopping routine
   *
   * @event stopped
   */
  Device.on('stopped', () => {
    if (utils.isMasterProcess(process.env)) {
      logger.publish(3, `${collectionName}`, 'on-stop:res', '');
      // return Device.updateAll({ status: true }, { status: false, clients: [] });
    }
  });

  /**
   * Event reporting that a device instance will be created or updated.
   * @event before_save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Device instance
   * @returns {Promise<function>} Device~onBeforeSave
   */
  Device.observe('before save', onBeforeSave);

  /**
   * Event reporting that a device instance has been created or updated.
   * @event after_save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Device instance
   * @returns {Promise<function>} Device~onAfterSave
   */
  Device.observe('after save', onAfterSave);

  /**
   * Event reporting that one or several device instance(s) will be deleted.
   * @event before_delete
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.where.id - Device instance
   * @returns {Promise<function>} Device~onBeforeDelete
   */
  Device.observe('before delete', onBeforeDelete);

  /**
   * Event reporting that a Device instance / collection is requested
   * @event before_*
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @returns {Promise<function>} Device~onBeforeRemote
   */
  Device.beforeRemote('**', async (ctx) => onBeforeRemote(Device.app, ctx));

  Device.afterRemoteError('*', (ctx, next) => {
    logger.publish(2, `${collectionName}`, `after ${ctx.methodString}:err`, ctx.error);
    // publish on collectionName/ERROR
    next();
  });

  /**
   * Find devices
   * @method module:Device.find
   * @param {object} filter
   * @returns {Promise<object[]>}
   */

  /**
   * Returns devices length
   * @method module:Device.count
   * @param {object} where
   * @returns {Promise<object>}
   */

  /**
   * Find device by id
   * @method module:Device.findById
   * @param {any} id
   * @param {object} filter
   * @returns {Promise<object>}
   */

  /**
   * Create device
   * @method module:Device.create
   * @param {object} device
   * @returns {Promise<object | object[]>}
   */

  /**
   * Update device by id
   * @method module:Device.updateById
   * @param {any} id
   * @param {object} filter
   * @returns {Promise<object>}
   */

  /**
   * Delete device by id
   * @method module:Device.deleteById
   * @param {any} id
   * @param {object} filter
   * @returns {Promise<object>}
   */

  /**
   * Get device sensors
   * @method module:Device.prototype.__get__sensors
   * @returns {Promise<object[]>}
   */

  /**
   * Get device sensor by id
   * @method module:Device.prototype.__findById__sensors
   * @param {string} id
   * @returns {Promise<object>}
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
