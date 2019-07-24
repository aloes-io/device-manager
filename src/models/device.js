import iotAgent from 'iot-agent';
import crypto from 'crypto';
import logger from '../services/logger';
import utils from '../services/utils';
import deviceTypes from '../initial-data/device-types.json';

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
module.exports = function(Device) {
  const collectionName = 'Device';

  const filteredProperties = ['children', 'size', 'show', 'group', 'success', 'error'];

  async function transportProtocolValidator(err) {
    if (
      this.transportProtocol &&
      (this.transportProtocol.toLowerCase() === 'aloesclient' ||
        this.transportProtocol.toLowerCase() === 'aloeslight' ||
        this.transportProtocol.toLowerCase() === 'mysensors' ||
        this.transportProtocol.toLowerCase() === 'lorawan')
    ) {
      return;
    }
    err();
  }

  async function messageProtocolValidator(err) {
    if (
      this.messageProtocol &&
      (this.messageProtocol.toLowerCase() === 'aloesclient' ||
        this.messageProtocol.toLowerCase() === 'aloeslight' ||
        this.messageProtocol.toLowerCase() === 'mysensors' ||
        this.messageProtocol.toLowerCase() === 'cayennelpp')
    ) {
      return;
    }
    err();
  }

  async function typeValidator(err) {
    if (this.type && deviceTypes[this.type]) {
      return;
    }
    err();
  }

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
  Device.validatesUniquenessOf('name', { scopedTo: ['ownerId'] });

  // Device.validatesDateOf("lastSignal", {message: "lastSignal is not a date"});

  Device.disableRemoteMethodByName('count');
  Device.disableRemoteMethodByName('upsertWithWhere');
  Device.disableRemoteMethodByName('replaceOrCreate');
  Device.disableRemoteMethodByName('createChangeStream');

  Device.disableRemoteMethodByName('prototype.__create__sensors');
  Device.disableRemoteMethodByName('prototype.__count__sensors');
  Device.disableRemoteMethodByName('prototype.__updateById__sensors');
  Device.disableRemoteMethodByName('prototype.__delete__sensors');
  Device.disableRemoteMethodByName('prototype.__destroyById__sensors');
  Device.disableRemoteMethodByName('prototype.__deleteById__sensors');
  Device.disableRemoteMethodByName('prototype.__link__sensors');
  Device.disableRemoteMethodByName('prototype.__unlink__sensors');

  Device.disableRemoteMethodByName('prototype.__link__collaborators');
  Device.disableRemoteMethodByName('prototype.__unlink__collaborators');

  /**
   * Set device QRcode access based on declared protocol and access point url
   * @method module:Device~setDeviceQRCode
   * @param {object} device - Device instance
   * returns {object} device
   */
  const setDeviceQRCode = device => {
    try {
      switch (device.transportProtocol.toLowerCase()) {
        case 'mysensors':
          if (device.accessPointUrl.endsWith('/#!1')) {
            device.qrCode = `${device.accessPointUrl}`;
          } else if (device.accessPointUrl) {
            device.qrCode = `${device.accessPointUrl}/param?mqtt_server=${
              process.env.MQTT_BROKER_HOST
            }&mqtt_port=${process.env.MQTT_BROKER_PORT}&mqtt_secure=${
              process.env.MQTT_SECURE
            }&http_server=${process.env.HTTP_SERVER_HOST}&http_port=${
              process.env.HTTP_SERVER_PORT
            }&http_secure=${process.env.HTTP_SECURE}&device_id=${device.id}&apikey=${
              device.apiKey
            }`;
          }
          break;
        case 'aloeslight':
          if (device.accessPointUrl.endsWith('/#!1')) {
            device.qrCode = `${device.accessPointUrl}`;
          } else if (device.accessPointUrl) {
            device.qrCode = `${device.accessPointUrl}/param?mqtt_server=${
              process.env.MQTT_BROKER_HOST
            }&mqtt_port=${process.env.MQTT_BROKER_PORT}&mqtt_secure=${
              process.env.MQTT_SECURE
            }&http_server=${process.env.HTTP_SERVER_HOST}&http_port=${
              process.env.HTTP_SERVER_PORT
            }&http_secure=${process.env.HTTP_SECURE}&device_id=${device.id}&apikey=${
              device.apiKey
            }`;
          }
          break;
        default:
        //  console.log(device);
      }
      return device;
    } catch (error) {
      return error;
    }
  };

  /**
   * Set device icons ( urls ) based on its type
   * @method module:Device~setDeviceIcons
   * @param {object} device - Device instance
   * returns {object} device
   */
  const setDeviceIcons = device => {
    try {
      if (device.type && deviceTypes[device.type]) {
        device.icons[0] = deviceTypes[device.type].icons[0];
        device.icons[1] = deviceTypes[device.type].icons[1];
      }
      return device;
    } catch (error) {
      return error;
    }
  };

  /**
   * Format packet and send it via MQTT broker
   * @method module:Device.publish
   * @param {object} device - Device instance
   * @param {string} method - MQTT method
   * @param {object} [client] - MQTT client target
   * returns {function} Device.app.publish()
   */
  Device.publish = async (device, method, client) => {
    try {
      if (!device || !device.ownerId) throw new Error('Wrong device instance');
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
          const nativePacket = { topic: `${device.devEui}-in/1/255/255/255`, payload: '1' };
          if (nativePacket.payload && nativePacket.payload !== null) {
            await Device.app.publish(nativePacket.topic, nativePacket.payload, false, 0);
          }
          //  console.log('nativePacket', nativePacket.topic);
        }
        if (device.appIds && device.appIds.length > 0) {
          await device.appIds.map(async appId => {
            try {
              const parts = packet.topic.split('/');
              parts[0] = appId;
              const topic = parts.join('/');
              await Device.app.publish(topic, packet.payload, false, 0);
              return topic;
            } catch (error) {
              return error;
            }
          });
        }
        logger.publish(4, `${collectionName}`, 'publish:res', {
          topic: packet.topic,
        });
        return Device.app.publish(packet.topic, packet.payload, true, 1);
      }
      throw new Error('Invalid MQTT Packet encoding');
    } catch (error) {
      logger.publish(4, `${collectionName}`, 'publish:err', error);
      return error;
    }
  };

  /**
   * Keys creation helper - update device attributes
   * @method module:Device~createKeys
   * @param {object} device - Device instance
   * returns {object} device
   */
  const createKeys = async device => {
    try {
      // let hwIdProp;
      // if (device.devEui && device.devEui !== null) {
      //   hwIdProp = 'devEui';
      // } else if (device.devAddr && device.devAddr !== null) {
      //   hwIdProp = 'devAddr';
      // }
      // if (!hwIdProp) throw new Error('Device hardware id not found');
      const attributes = {};
      let hasChanged = false;
      if (!device.clientKey) {
        attributes.clientKey = utils.generateKey('client');
        hasChanged = true;
      }
      if (!device.apiKey) {
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
      }
      return device;
    } catch (error) {
      return error;
    }
  };

  /**
   * Reset keys for the application instance
   * @callback {Function} callback
   * @param {Error} err
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
   * @param {object} device - Device instance
   * @returns {functions} device.updateAttributes
   */
  Device.refreshToken = async (ctx, device) => {
    try {
      logger.publish(4, `${collectionName}`, 'refreshToken:req', device.id);
      if (!ctx.req.accessToken) throw new Error('missing token');
      if (!device.id) throw new Error('missing device.id');
      if (ctx.req.accessToken.userId.toString() !== device.ownerId.toString()) {
        throw new Error('Invalid user');
      }
      device = await Device.findById(device.id);
      if (device && device !== null) {
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
      throw new Error('Missing Device instance');
    } catch (error) {
      logger.publish(4, `${collectionName}`, 'refreshToken:err', error);
      return error;
    }
  };

  /**
   * Init device depencies ( token, address )
   * @method module:Device~createProps
   * @param {object} ctx - Application context
   * @param {object} ctx.req - HTTP request
   * @param {object} ctx.res - HTTP response
   * returns {function} module:Device.publish
   */
  const createProps = async ctx => {
    try {
      await ctx.instance.deviceAddress.create({
        street: '',
        streetNumber: null,
        streetName: null,
        postalCode: null,
        city: null,
        public: false,
      });
      const device = await createKeys(ctx.instance);
      // todo create a sensor 3310 to report event and request network load
      if (!ctx.instance.deviceAddress || !device) {
        await Device.destroyById(ctx.instance.id);
        throw new Error('no device address');
      }
      return Device.publish(device, 'POST');
    } catch (error) {
      return error;
    }
  };

  /**
   * Update device depencies ( token, sensors )
   * @method module:Device~updateProps
   * @param {object} ctx - Application context
   * @param {object} ctx.req - HTTP request
   * @param {object} ctx.res - HTTP response
   * returns {function} module:Device.publish
   */
  const updateProps = async ctx => {
    try {
      const device = await createKeys(ctx.instance);
      const sensorsCount = await ctx.instance.sensors.count();
      if (sensorsCount && sensorsCount > 0) {
        await Device.app.models.SensorResource.updateCache(device);
      }
      logger.publish(4, `${collectionName}`, 'updateProps:res', {
        device,
      });
      return Device.publish(device, 'PUT');
    } catch (error) {
      return error;
    }
  };

  Device.createOrUpdate = async device => {
    try {
      logger.publish(4, `${collectionName}`, 'createOrUpdate:req', {
        device: device.name,
      });
      if (!device || device === null) throw new Error('Invalid device input');
      if (device.id && (await Device.exists(device.id))) {
        device = await Device.replaceById(device.id, device);
      } else {
        device = await Device.create(device);
      }
      return device;
    } catch (error) {
      logger.publish(4, `${collectionName}`, 'createOrUpdate:err', error);
      return error;
    }
  };
  /**
   * Synchronize cache memory with database on disk
   * @method module:Device.syncCache
   * @param {string} [direction] - UP to save on disk | DOWN to save on cache,
   */
  Device.syncCache = async (direction = 'UP') => {
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
      return error;
    }
  };

  /**
   * Find device related to incoming MQTT packet
   * @method module:Device.findByPattern;
   * @param {object} pattern - IotAgent parsed pattern
   * @param {object} attributes - IotAgent parsed message
   * @returns {object} device
   */
  Device.findByPattern = async (pattern, attributes) => {
    try {
      const params = pattern.params;
      const transportProtocol = attributes.transportProtocol || pattern.name;
      const transportProtocolFilter = {
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
          devEui: { like: new RegExp(`.*${attributes.devEui}.*`, 'i') },
        });
      }
      if (attributes.devAddr && attributes.devAddr !== null) {
        deviceFilter.where.and.push({
          devAddr: { like: new RegExp(`.*${attributes.devAddr}.*`, 'i') },
        });
      }

      //  console.log('onPublish, filter device :', deviceFilter.where.and);
      const device = await Device.findOne(deviceFilter);
      if (!device || device === null || !device.id) {
        throw new Error('no device found');
      }
      logger.publish(4, `${collectionName}`, 'findByPattern:res', {
        deviceName: device.name,
        deviceId: device.id,
      });
      return device;
    } catch (error) {
      return error;
    }
  };

  /**
   * Find properties and dispatch to the right function
   *
   * Adding device and sensor context to raw incoming data
   *
   * @method module:Device~parseMessage
   * @param {object} pattern - Pattern detected by IotAgent
   * @param {object} attributes - IotAgent parsed message
   * @param {object} client - MQTT client
   * @fires module:Sensor~publish
   */
  const parseMessage = async (pattern, attributes, client) => {
    try {
      logger.publish(4, `${collectionName}`, 'parseMessage:req', {
        nativeSensorId: attributes.nativeSensorId,
      });
      if (
        attributes.devEui &&
        attributes.nativeSensorId &&
        (attributes.type || attributes.resource)
      ) {
        const device = await Device.findByPattern(pattern, attributes);
        if (!device || device === null || device instanceof Error) return null;
        // await device.updateAttributes({
        //   frameCounter: device.frameCounter + 1 || 1,
        //   lastSignal: attributes.lastSignal || new Date(),
        // });
        const Sensor = Device.app.models.Sensor;
        return Sensor.emit('publish', { device, pattern, attributes, client });
      }
      throw new Error('Missing params');
    } catch (error) {
      logger.publish(4, `${collectionName}`, 'parseMessage:err', error);
      return error;
    }
  };

  /**
   * Dispatch incoming MQTT packet
   * @method module:Device.onPublish
   * @param {object} packet - MQTT bridge packet
   * @param {object} client - MQTT client
   * @param {object} pattern - Pattern detected by Iot-Agent
   * @returns {functions} parseMessage
   */
  Device.onPublish = async (packet, client, pattern) => {
    try {
      if (!pattern || !pattern.params || !pattern.name) {
        throw new Error('Missing argument');
      }
      if (pattern.name.toLowerCase() === 'aloesclient') {
        if (!client) return null;
        if (pattern.subType === 'iot') {
          const newPacket = await iotAgent.decode(packet, pattern.params);
          if (newPacket && newPacket.topic) {
            // todo use client.publish instead ?
            //   cmd: 'publish',
            // messageId: 42,
            // qos: 2,
            // dup: false,
            // topic: 'test',
            // payload: new Buffer('test'),
            // retain: false,
            // properties: { // optional properties MQTT 5.0
            //     payloadFormatIndicator: true,
            //     messageExpiryInterval: 4321,
            //     topicAlias: 100,
            //     responseTopic: 'topic',
            //     correlationData: Buffer.from([1, 2, 3, 4]),
            //     userProperties: {
            //       'test': 'test'
            //     },
            //     subscriptionIdentifier: 120,
            //     contentType: 'test'
            //  }
            logger.publish(4, `${collectionName}`, 'onPublish:redirect to', newPacket.topic);
            return Device.app.publish(newPacket.topic, newPacket.payload, false, 1);
          }
        }
      } else if (!client) return null;
      const attributes = await iotAgent.encode(packet, pattern);
      //  logger.publish(4, `${collectionName}`, 'onPublish:res', attributes);
      if (!attributes) throw new Error('No attributes result');
      logger.publish(4, `${collectionName}`, 'onPublish:res', pattern);
      return parseMessage(pattern, attributes, client);
    } catch (error) {
      logger.publish(4, `${collectionName}`, 'onPublish:err', error);
      return error;
    }
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
      logger.publish(5, collectionName, 'detector:res', pattern);
      return pattern;
    } catch (error) {
      logger.publish(2, collectionName, 'detector:err', error);
      return error;
    }
  };

  /**
   * Update device status from MQTT connection status
   * @method module:Device.updateStatus
   * @param {object} client - MQTT client
   * @param {boolean} status - MQTT connection status
   * @returns {functions} device.updateAttributes
   */
  Device.updateStatus = async (client, status) => {
    try {
      if (!client.devEui || client.devEui === null) throw new Error('Invalid client type');
      logger.publish(5, collectionName, 'updateStatus:req', status);
      const device = await Device.findById(client.user);
      if (device && device !== null && device.devEui === client.devEui) {
        const Client = Device.app.models.Client;
        let foundClient = JSON.parse(await Client.get(client.id));
        let ttl;
        if (!foundClient) {
          foundClient = { id: client.id, type: 'MQTT', model: 'Device' };
        }
        let frameCounter = device.frameCounter;
        const clients = device.clients;
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
          }
        }
        foundClient.status = status;
        await Client.set(client.id, JSON.stringify(foundClient), ttl);
        logger.publish(4, collectionName, 'updateStatus:res', foundClient);
        await device.updateAttributes({
          frameCounter,
          status,
          lastSignal: new Date(),
          clients,
        });
      }
      return client;
    } catch (error) {
      return error;
    }
  };

  /**
   * When device found, execute method extracted from MQTT topic
   * @param {object} device - found Device instance
   * @param {string} method - MQTT API method
   * @param {object} [client] - MQTT client target
   * @returns {functions}
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
          device = await Device.createOrUpdate(device);
          break;
        case 'PUT':
          device = await Device.createOrUpdate(device);
          break;
        case 'STREAM':
          await Device.publish(device, 'STREAM');
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
      return error;
    }
  };

  /**
   * Event reporting that an device client connection status has changed.
   * @event client
   * @param {object} message - Parsed MQTT message.
   * @property {object} message.client - MQTT client
   * @property {boolean} message.status - MQTT client status.
   * @returns {functions} Device.updateStatus
   */
  Device.on('client', async message => {
    try {
      if (!message || message === null) throw new Error('Message empty');
      const status = message.status;
      const client = message.client;
      if (!client || !client.user || status === undefined) {
        throw new Error('Message missing properties');
      }
      return Device.updateStatus(client, status);
    } catch (error) {
      return error;
    }
  });

  /**
   * Event reporting that a device client sent a message.
   * @event publish
   * @param {object} message - Parsed MQTT message.
   * @property {object} message.packet - MQTT packet.
   * @property {object} message.pattern - Pattern detected by Iot-Agent
   * @property {object} [message.client] - Found Device instance
   * @property {object} message.client - MQTT client
   */
  Device.on('publish', async message => {
    try {
      if (!message || message === null) throw new Error('Message empty');
      const packet = message.packet;
      const client = message.client;
      const pattern = message.pattern;
      const device = message.device;
      logger.publish(4, collectionName, 'on:publish', pattern.name);
      if (!packet || !pattern) throw new Error('Message missing properties');
      if (device && device !== null) {
        return Device.execute(device, pattern.params.method, client);
      }
      return Device.onPublish(packet, client, pattern);
    } catch (error) {
      return error;
    }
  });

  /**
   * Event reporting that a device instance will be created or updated.
   * @event before save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Device instance
   */
  Device.observe('before save', async ctx => {
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
        if (ctx.instance.transportProtocol && ctx.instance.transportProtocol !== null) {
          await setDeviceQRCode(ctx.instance);
        }
        //  logger.publish(3, `${collectionName}`, "beforeSave:res1", device);
        if (ctx.instance.type && ctx.instance.type !== null) {
          await setDeviceIcons(ctx.instance);
        }
        logger.publish(5, collectionName, 'beforeSave:res', ctx.instance);
        return ctx;
      }
      // else if (ctx.currentInstance) {
      //   device = ctx.currentInstance;
      // }
      return ctx;
    } catch (error) {
      logger.publish(3, `${collectionName}`, 'beforeSave:err', error);
      return error;
    }
  });

  /**
   * Event reporting that a device instance has been created or updated.
   * @event after save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Device instance
   */
  Device.observe('after save', async ctx => {
    try {
      if (ctx.hookState.updateData) {
        logger.publish(4, `${collectionName}`, 'afterSave:req', ctx.hookState.updateData);
        const updatedProps = Object.keys(ctx.hookState.updateData);
        if (updatedProps.some(prop => prop === 'status')) {
          await Device.publish(ctx.instance, 'HEAD');
        }
        return ctx;
      } else if (ctx.instance && Device.app) {
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
      return error;
    }
  });

  Device.afterRemoteError('*', async ctx => {
    try {
      logger.publish(4, `${collectionName}`, `after ${ctx.methodString}:err`, '');
      // publish on collectionName/ERROR
      return ctx;
    } catch (error) {
      return error;
    }
  });

  /**
   * Event reporting that a device instance / collection is requested
   * @event before find
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @returns {object} ctx
   */
  Device.beforeRemote('**', async ctx => {
    try {
      if (ctx.req.headers.apikey) ctx.args.options.apikey = ctx.req.headers.apikey;
      if (ctx.req.headers.appId) ctx.args.options.appId = ctx.req.headers.appId;
      if (ctx.req.headers.devEui) ctx.args.options.devEui = ctx.req.headers.devEui;
      if (
        ctx.method.name.indexOf('find') !== -1 ||
        ctx.method.name.indexOf('__get') !== -1 ||
        ctx.method.name.indexOf('get') !== -1
      ) {
        logger.publish(4, `${collectionName}`, 'beforeFind:req', {
          query: ctx.req.query,
          params: ctx.req.params,
        });

        let getSensors = false;
        let result;

        if (ctx.method.name.startsWith('__get')) {
          const methodParts = ctx.method.name.split('__');
          const modelName = methodParts[2];
          const params = ctx.req.params;
          //  console.log('[DEVICE] beforeRemote get:req', modelName, params);
          if (modelName === 'sensors' && params && params.id) {
            getSensors = true;
            const id = params.id;
            const device = await Device.findById(id);
            result = [JSON.parse(JSON.stringify(device))];
          }
        }

        if (ctx.req.query.filter) {
          const whereFilter = JSON.parse(ctx.req.query.filter);
          //  console.log('[DEVICE] beforeRemote get:req', whereFilter);
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
            // console.log('query filter: res', whereFilter);
          }

          if (whereFilter && whereFilter.id) {
            const id = whereFilter.where.id;
            const device = await Device.findById(id);
            result = [JSON.parse(JSON.stringify(device))];
          } else if (whereFilter.where && whereFilter.where.ownerId) {
            const devices = await Device.find(whereFilter);
            result = JSON.parse(JSON.stringify(devices));
          }
        }
        //  console.log('result', result.length);
        if (result && getSensors) {
          const promises = await result.map(Device.app.models.SensorResource.includeCache);
          result = await Promise.all(promises);
          ctx.result = result;
        } else if (result) {
          ctx.result = result;
        }
        //  logger.publish(4, `${collectionName}`, 'beforeFind:res', ctx.result.length);
        return ctx;
      }
      return ctx;
    } catch (error) {
      return error;
    }
  });

  /**
   * Event reporting that a device instance will be deleted.
   * @event before delete
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.where.id - Device instance
   */
  Device.observe('before delete', async ctx => {
    try {
      if (ctx.where.id) {
        const instance = await ctx.Model.findById(ctx.where.id);
        logger.publish(4, `${collectionName}`, 'beforeDelete:req', instance.id);
        await Device.app.models.Address.destroyAll({
          deviceId: instance.id,
        });
        const sensors = await instance.sensors.find();
        if (sensors && sensors !== null) {
          const promises = await sensors.map(async sensor => sensor.delete());
          await Promise.all(promises);
        }
        if (instance && instance.ownerId) {
          await Device.publish(instance, 'DELETE');
          return ctx;
        }
      }
      throw new Error('no instance to delete');
    } catch (error) {
      return error;
    }
  });

  /**
   * Endpoint for device authentification with APIKey
   *
   * @method module:Device.authenticate
   * @param {Any} deviceId
   * @param {String} key
   * @param {Error} err
   * @param {String} matched The matching key; one of:
   * - clientKey
   * - apiKey
   * - javaScriptKey
   * - restApiKey
   * - windowsKey
   * - masterKey
   * @promise
   */
  Device.authenticate = async (deviceId, key) => {
    try {
      const device = await Device.findById(deviceId);
      if (!device || device instanceof Error) {
        throw new Error(' Cannot authenticate device');
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
        if (device[k] && device[k] === key) {
          result = {
            device,
            keyType: k,
          };
        }
      });
      return result;
    } catch (error) {
      return error;
    }
  };

  /**
   * Endpoint for device requesting their own state
   * @method module:Device~getState
   * @param {object} ctx - Loopback context
   * @param {string} deviceId - Device instance id
   * @returns {object}
   */
  Device.getState = async (deviceId, options) => {
    try {
      console.log('getstate, req : ', deviceId, options);
      if (!options || !options.apikey) throw new Error('missing token');
      if (!deviceId) throw new Error('missing device.id');
      const tokenId = options.apikey.trim();
      logger.publish(4, `${collectionName}`, 'getState:req', { deviceId, tokenId });

      const device = await Device.findById(deviceId, {
        fields: {
          id: true,
          devEui: true,
          devAddr: true,
          apiKey: true,
          frameCounter: true,
          name: true,
          state: true,
        },
      });

      if (device && device !== null) {
        const authentification = await Device.authenticate(deviceId, tokenId);
        if (authentification && authentification.keyType) {
          return device;
        }
        // const foundToken = await device.accessTokens.findById(tokenId);
        // //  console.log('getstate, token : ', tokenId, device.apiKey, foundToken);
        // if (foundToken && foundToken !== null) {
        //   return device;
        // }
        //  ctx.res.status(403);
        return null;
      }
      //  ctx.res.status(404);
      return null;
    } catch (error) {
      return error;
    }
  };

  /**
   * Update OTA if a firmware is available
   * @method module:Device~getOTAUpdate
   * @param {object} ctx - Loopback context
   * @param {string} deviceId - Device instance id
   * @param {string} [version] - Firmware version requested
   * @returns {object}
   */
  Device.getOTAUpdate = async (ctx, deviceId, version) => {
    try {
      const checkHeader = (headers, key, value = false) => {
        if (!headers[key]) {
          return false;
        }
        if (value && headers[key] !== value) {
          return false;
        }
        return true;
      };

      const headers = ctx.req.headers;
      console.log('headers', headers);

      if (checkHeader(headers, 'user-agent', 'ESP8266-http-Update')) {
        if (
          !checkHeader(headers, 'x-esp8266-sta-mac') ||
          !checkHeader(headers, 'x-esp8266-ap-mac') ||
          !checkHeader(headers, 'x-esp8266-free-space') ||
          !checkHeader(headers, 'x-esp8266-sketch-size') ||
          !checkHeader(headers, 'x-esp8266-sketch-md5') ||
          !checkHeader(headers, 'x-esp8266-chip-size') ||
          !checkHeader(headers, 'x-esp8266-sdk-version') ||
          !checkHeader(headers, 'x-esp8266-mode')
        ) {
          ctx.res.status(403);
          console.log('invalid ESP8266 header');
          throw new Error('invalid ESP8266 header');
        }

        const devEui = headers['x-esp8266-sta-mac'].split(':').join('');
        const filter = {
          where: {
            or: [
              { id: deviceId },
              {
                devEui: {
                  like: new RegExp(`.*${devEui}.*`, 'i'),
                },
              },
            ],
          },
        };
        const device = await Device.findOne(filter);
        //  const device = await Device.findById(deviceId);
        //  console.log('#device ', device);
        if (!device || device === null) {
          ctx.res.status(403);
          throw new Error('No device found');
        }
        // const token = await device.accessTokens.findById(device.apiKey);
        // // console.log('getstate, token : ', token);
        // if (!token || token !== null) {
        //   ctx.res.status(403);
        //   throw new Error('No valid token found');
        // }
        console.log('devEui', devEui, device.devEui);
        ctx.res.set('Content-Type', `application/octet-stream`);
        // look for meta containing firmware tag ?
        //  const fileFilter = { where: { role: {like: new RegExp(`.*firmware.*`, 'i')} } };
        // const fileFilter = { where: { name: { like: new RegExp(`.*bin.*`, 'i') } } };
        // const fileMeta = await device.files.findOne(fileFilter);

        const fileFilter = {
          where: {
            and: [
              { ownerId: device.ownerId.toString() },
              { name: { like: new RegExp(`.*bin.*`, 'i') } },
              { name: { like: new RegExp(`.*${device.id}.*`, 'i') } },
            ],
          },
        };

        const fileMeta = await Device.app.models.files.findOne(fileFilter);
        //  const fileMeta = await device.files.findOne(fileFilter);

        if (version && fileMeta.version && fileMeta.version === version) {
          ctx.res.status(304);
          throw new Error('already up to date');
        }
        ctx.res.set('Content-Disposition', `attachment; filename=${fileMeta.name}`);

        //  const readStream = Device.app.models.container.downloadStream(device.id.toString(), fileMeta.name);
        const readStream = Device.app.models.container.downloadStream(
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
        ctx.res.status(304);
        throw new Error('Error while reading stream');
      }
      ctx.res.status(403);
      throw new Error('only for ESP8266 updater');
    } catch (error) {
      return error;
    }
  };

  /**
   * Helper for device search
   * @method module:Device~findDevice
   * @param {object} whereFilter - Device filter
   * @returns {promise} Device.find
   */
  const findDevice = async whereFilter =>
    new Promise((resolve, reject) => {
      Device.find(whereFilter, (err, devices) => (err ? reject(err) : resolve(devices)));
    });

  /**
   * Search device by location ( keyword )
   * @method module:Device.search
   * @param {object} filter - Requested filter
   * @returns {array} devies
   */
  Device.search = async (ctx, filter) => {
    logger.publish(4, `${collectionName}`, 'search:req', filter);
    try {
      if (!ctx.req.accessToken.userId || !filter.place) {
        throw new Error('Invalid request');
      }
      let whereFilter;
      if (filter.place && filter.place !== null) {
        whereFilter = {
          where: {
            fullAddress: {
              like: new RegExp(`.*${filter.place}.*`, 'i'),
            },
          },
          include: 'deviceAddress',
        };
      } else {
        throw new Error('No place selected');
      }
      const devices = await findDevice(whereFilter);
      logger.publish(2, `${collectionName}`, 'search:res', devices);
      return devices;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'search:err', error);
      return error;
    }
  };

  /**
   * Helper for reverse geocoding
   * @method module:Device~findAddresses
   * @param {object} filter - Device location filter
   * @returns {promise} Device.app.models.Address.find
   */
  const findAddresses = async filter =>
    new Promise((resolve, reject) => {
      Device.app.models.Address.find(
        {
          where: {
            public: true,
            coordinates: {
              near: filter.location,
              maxDistance: filter.maxDistance,
              unit: filter.unit,
            },
          },
        },
        (err, addresses) => (err ? reject(err) : resolve(addresses)),
      );
    });

  /**
   * Search device by location ( GPS coordinates )
   * @method module:Device.geoLocate
   * @param {object} filter - Requested filter
   * @returns {array} deviceAddresses
   */
  Device.geoLocate = async filter => {
    try {
      logger.publish(4, `${collectionName}`, 'geoLocate:req', filter);
      const addresses = await findAddresses(filter);
      //  logger.publish(4, `${collectionName}`, 'geoLocate:res', addresses);
      if (!addresses) {
        throw new Error('No match found');
      }
      const deviceAddresses = await addresses.filter(address => address.deviceId);
      let devices = [];
      logger.publish(4, `${collectionName}`, 'geoLocate:res', deviceAddresses);
      if (deviceAddresses.length > 0) {
        devices = await utils.composeGeoLocateResult(collectionName, deviceAddresses);
      }
      return devices;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'geoLocate:err', error);
      return error;
    }
  };
};
