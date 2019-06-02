import iotAgent from 'iot-agent';
import logger from '../services/logger';
import utils from '../services/utils';

/**
 * @module Device
 */

module.exports = function(Device) {
  const collectionName = 'Device';

  // async function protocolNameValidator(err) {
  //   const protocolPatternsKeys = Object.getOwnPropertyNames(handlers.protocolPatterns);
  //   if (protocolPatternsKeys.find((key) => key === this.protocolName)) return;
  //   err();
  // }

  function transportProtocolValidator(err) {
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

  function messageProtocolValidator(err) {
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

  function typeValidator(err) {
    if (
      this.type &&
      (this.type.toLowerCase() === 'audio-input' ||
        this.type.toLowerCase() === 'audio-output' ||
        this.type.toLowerCase() === 'bot' ||
        this.type.toLowerCase() === 'browser' ||
        this.type.toLowerCase() === 'camera' ||
        this.type.toLowerCase() === 'gateway' ||
        this.type.toLowerCase() === 'light-output' ||
        this.type.toLowerCase() === 'midi-input' ||
        this.type.toLowerCase() === 'midi-output' ||
        this.type.toLowerCase() === 'node' ||
        this.type.toLowerCase() === 'phone' ||
        this.type.toLowerCase() === 'rfid' ||
        this.type.toLowerCase() === 'switch-input' ||
        this.type.toLowerCase() === 'switch-output')
    ) {
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

  Device.validatesUniquenessOf('devEui', { scopedTo: ['ownerId'] });
  // Device.validatesDateOf("lastSignal", {message: "lastSignal is not a date"});

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
            device.qrCode = `${device.accessPointUrl}/wifi?server=${
              process.env.MQTT_BROKER_HOST
            }&port=${process.env.MQTT_BROKER_PORT}&client=${device.devEui}&user=${
              device.id
            }&password=${device.apiKey}`;
          }
          break;
        case 'aloeslight':
          if (device.accessPointUrl.endsWith('/#!1')) {
            device.qrCode = `${device.accessPointUrl}`;
          } else if (device.accessPointUrl) {
            device.qrCode = `${device.accessPointUrl}/wifi?server=${
              process.env.MQTT_BROKER_HOST
            }&port=${process.env.MQTT_BROKER_PORT}&client=${device.devEui}&user=${
              device.id
            }&password=${device.apiKey}`;
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
      switch (device.type) {
        case 'audio-input':
          device.icons[0] = `/icons/aloes/audio-input.png`;
          device.icons[1] = `/icons/aloes/audio-input-white.png`;
          break;
        case 'audio-output':
          device.icons[0] = `/icons/aloes/audio-output.png`;
          device.icons[1] = `/icons/aloes/audio-output-white.png`;
          break;
        case 'bot':
          device.icons[0] = `/icons/aloes/bot.png`;
          device.icons[1] = `/icons/aloes/bot-white.png`;
          break;
        case 'browser':
          device.icons[0] = `/icons/aloes/browser.png`;
          device.icons[1] = `/icons/aloes/browser-white.png`;
          break;
        case 'camera':
          device.icons[0] = `/icons/aloes/camera.png`;
          device.icons[1] = `/icons/aloes/camera-white.png`;
          break;
        case 'gateway':
          device.icons[0] = `/icons/aloes/gateway.png`;
          device.icons[1] = `/icons/aloes/gateway-white.png`;
          break;
        case 'light-output':
          device.icons[0] = `/icons/aloes/light-output.png`;
          device.icons[1] = `/icons/aloes/light-output-white.png`;
          break;
        case 'midi-input':
          device.icons[0] = `/icons/aloes/midi-input.png`;
          device.icons[1] = `/icons/aloes/midi-input-white.png`;
          break;
        case 'midi-output':
          device.icons[0] = `/icons/aloes/midi-output.png`;
          device.icons[1] = `/icons/aloes/midi-output-white.png`;
          break;
        case 'node':
          device.icons[0] = `/icons/aloes/node.png`;
          device.icons[1] = `/icons/aloes/node-white.png`;
          break;
        case 'phone':
          device.icons[0] = `/icons/aloes/phone.png`;
          device.icons[1] = `/icons/aloes/phone-white.png`;
          break;
        case 'rfid':
          device.icons[0] = `/icons/aloes/rfid.png`;
          device.icons[1] = `/icons/aloes/rfid-white.png`;
          break;
        case 'switch-input':
          device.icons[0] = `/icons/aloes/switch-input.png`;
          device.icons[1] = `/icons/aloes/switch-input-white.png`;
          break;
        case 'switch-output':
          device.icons[0] = `/icons/aloes/switch-output.png`;
          device.icons[1] = `/icons/aloes/switch-output-white.png`;
          break;
        default:
        //  console.log(device.type);
      }
      return device;
    } catch (error) {
      return error;
    }
  };

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
      let device;
      if (ctx.data) {
        logger.publish(4, `${collectionName}`, 'beforeSave:req', ctx.data);
        device = ctx.data;
        ctx.hookState.updateData = ctx.data;
        return ctx;
      }
      if (ctx.instance) {
        logger.publish(4, `${collectionName}`, 'beforeSave:req', ctx.instance);
        device = ctx.instance;
      }
      // else if (ctx.currentInstance) {
      //   device = ctx.currentInstance;
      // }
      if (device.children) {
        delete device.children;
      }
      if (device.transportProtocol && device.transportProtocol !== null) {
        await setDeviceQRCode(device);
      }
      //  logger.publish(3, `${collectionName}`, "beforeSave:res1", device);
      if (device.type && device.type !== null) {
        await setDeviceIcons(device);
      }
      logger.publish(4, collectionName, 'beforeSave:res', device);
      return device;
    } catch (error) {
      logger.publish(3, `${collectionName}`, 'beforeSave:err', error);
      return error;
    }
  });

  Device.publish = async (device, method) => {
    try {
      const packet = await iotAgent.publish({
        userId: device.ownerId,
        collectionName,
        data: device,
        modelId: device.id,
        method: method || device.method,
        pattern: 'aloesClient',
      });
      if (packet && packet.topic && packet.payload) {
        return Device.app.emit('publish', packet.topic, packet.payload, false, 0);
      }
      throw new Error('Invalid MQTT Packet encoding');
    } catch (error) {
      return error;
    }
  };

  /**
   * Token creation helper
   * @method module:Device~createToken
   * @param {object} device - Device instance
   * returns {object} token
   */
  const createToken = async device => {
    try {
      let idProp;
      if (device.devEui && device.devEui !== null) {
        idProp = 'devEui';
      } else if (device.devAddr && device.devAddr !== null) {
        idProp = 'devAddr';
      }
      if (!idProp) throw new Error('Device hardware id not found');
      const token = await device.accessTokens.create({
        [idProp]: device[idProp],
        ttl: -1,
      });
      return token;
    } catch (error) {
      return error;
    }
  };

  /**
   * Init device depencies ( token, address )
   * @method module:Device~createDeviceProps
   * @param {object} ctx - Application context
   * @param {object} ctx.req - HTTP request
   * @param {object} ctx.res - HTTP response
   */
  const createDeviceProps = async ctx => {
    try {
      await ctx.instance.deviceAddress.create({
        street: '',
        streetNumber: null,
        streetName: null,
        postalCode: null,
        city: null,
        public: false,
      });
      const token = await createToken(ctx.instance);
      if (!ctx.instance.deviceAddress || !token) {
        await Device.destroyById(ctx.instance.id);
        throw new Error('no device address');
      }
      await ctx.instance.updateAttribute('apiKey', token.id.toString());
      return Device.publish(ctx.instance, 'POST');
    } catch (error) {
      return error;
    }
  };

  /**
   * Update device depencies ( token, sensors )
   * @method module:Device~updateDeviceProps
   * @param {object} ctx - Application context
   * @param {object} ctx.req - HTTP request
   * @param {object} ctx.res - HTTP response
   */
  const updateDeviceProps = async ctx => {
    try {
      const token = await ctx.instance.accessTokens.findById(ctx.instance.apiKey);
      if (!token || token === null) throw new Error('Device API key not found');
      let idProp;
      if (ctx.instance.devEui && ctx.instance.devEui !== null) {
        idProp = 'devEui';
      } else if (ctx.instance.devAddr && ctx.instance.devAddr !== null) {
        idProp = 'devAddr';
      }
      if (!idProp) throw new Error('Device hardware id not found');
      token.updateAttribute(idProp, ctx.instance[idProp]);
      const sensors = await ctx.instance.sensors.find();
      if (sensors && sensors !== null) {
        await Device.app.models.Sensor.updateAll(
          { deviceId: ctx.instance.id },
          {
            [idProp]: ctx.instance[idProp],
            transportProtocol: ctx.instance.transportProtocol,
            transportProtocolVersion: ctx.instance.transportProtocolVersion,
            messageProtocol: ctx.instance.messageProtocol,
            messageProtocolVersion: ctx.instance.messageProtocolVersion,
          },
        );
      }
      logger.publish(4, `${collectionName}`, 'updateDeviceProps:res', {
        idProp,
        token,
      });
      return Device.publish(ctx.instance, 'PUT');
    } catch (error) {
      return error;
    }
  };

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
      // if (ctx.data)
      if (ctx.hookState.updateData) {
        logger.publish(4, `${collectionName}`, 'afterSave:req', ctx.hookState.updateData);
        const updatedProps = Object.keys(ctx.hookState.updateData);
        if (updatedProps.some(prop => prop === 'status')) {
          return Device.publish(ctx.instance, 'PUT');
        }
      } else if (ctx.instance && Device.app) {
        logger.publish(4, `${collectionName}`, 'afterSave:req', ctx.instance);
        if (ctx.isNewInstance) {
          return createDeviceProps(ctx);
        }
        return updateDeviceProps(ctx);
      }
      return ctx;
    } catch (error) {
      logger.publish(3, `${collectionName}`, 'afterSave:err', error);
      return error;
    }
  });

  /**
   * Find sensors in the cache and add to device instance
   * @method module:Device~addCachedSensors
   * @param {object} device - device instance
   */
  const addCachedSensors = async device => {
    try {
      const SensorResource = Device.app.models.SensorResource;
      const sensorsKeys = await SensorResource.keys({
        match: `deviceId-${device.id}-sensorId-*`,
      });
      logger.publish(5, `${collectionName}`, 'addCachedSensors:req', sensorsKeys);
      const promises = await sensorsKeys.map(async key =>
        JSON.parse(await SensorResource.get(key)),
      );
      const sensors = await Promise.all(promises);
      logger.publish(5, `${collectionName}`, 'addCachedSensors:res', sensors[0]);
      if (sensors && sensors !== null) {
        device.sensors = sensors;
      }
      return device;
    } catch (err) {
      throw err;
    }
  };

  /**
   * Event reporting that a device instance has been created or updated.
   * @event after save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Device instance
   */
  Device.beforeRemote('**', async ctx => {
    try {
      if (
        ctx.method.name.indexOf('find') !== -1 ||
        ctx.method.name.indexOf('__get') !== -1 ||
        ctx.method.name.indexOf('get') !== -1
      ) {
        logger.publish(4, `${collectionName}`, 'beforeFind:req', {
          query: ctx.req.query,
          param: ctx.req.param,
        });

        let getSensors = false;
        let result;

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
          }
          if (whereFilter && whereFilter.id) {
            const id = whereFilter.where.id;
            const device = await Device.findById(id);
            result = [JSON.parse(JSON.stringify(device))];
          } else if (whereFilter.where && whereFilter.where.ownerId) {
            const devices = await Device.find(whereFilter);
            result = JSON.parse(JSON.stringify(devices));
          }

          if (getSensors) {
            result = await result.map(addCachedSensors);
            const devices = await Promise.all(result);
            //  ctx.result = await Promise.all(result);
            ctx.result = devices;
          } else {
            ctx.result = result;
          }
          logger.publish(4, `${collectionName}`, 'beforeFind:res', ctx.result.length);
          return ctx;
        }
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
        await Device.app.models.accessToken.destroyById(instance.apiKey);
        const sensors = await instance.sensors.find();
        if (sensors && sensors !== null) {
          sensors.forEach(async sensor => instance.sensors.deleteById(sensor.id));
        }
        // await Device.app.models.Sensor.destroyAll({
        //   deviceId: instance.id,
        // });

        if (instance && instance.ownerId && Device.app) {
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
   * Find device related to incoming MQTT packet
   * @method module:Device.findByPattern
   * @param {object} pattern - IotAgent parsed pattern
   * @param {object} encoded - IotAgent parsed message
   * @returns {object} device
   */
  Device.findByPattern = async (pattern, encoded) => {
    try {
      const transportProtocol = {
        like: new RegExp(`.*${pattern.name}.*`, 'i'),
      };
      // const messageProtocol = {
      //   like: new RegExp(`.*${pattern.name}.*`, 'i'),
      // };
      const deviceFilter = {
        where: {
          and: [{ transportProtocol }],
        },
        include: {
          relation: 'sensors',
          scope: {
            where: {
              and: [
                {
                  nativeSensorId: encoded.nativeSensorId,
                },
              ],
            },
            limit: 1,
          },
        },
      };
      if (encoded.type && encoded.type !== null) {
        deviceFilter.include.scope.where.and.push({
          type: encoded.type,
        });
      }
      if (encoded.nativeNodeId && encoded.nativeNodeId !== null) {
        deviceFilter.include.scope.where.and.push({
          nativeNodeId: encoded.nativeNodeId,
        });
      }
      if (encoded.devEui && encoded.devEui !== null) {
        deviceFilter.where.and.push({
          devEui: { like: new RegExp(`.*${encoded.devEui}.*`, 'i') },
        });
      }
      if (encoded.devAddr && encoded.devAddr !== null) {
        deviceFilter.where.and.push({
          devAddr: { like: new RegExp(`.*${encoded.devAddr}.*`, 'i') },
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
   * @method module:Device~parseMessage
   * @param {object} pattern - Pattern detected by IotAgent
   * @param {object} encoded - IotAgent parsed message
   * @returns {functions} getInstance
   * @returns {functions} createOrUpdateSensor
   */
  const parseMessage = async (pattern, encoded) => {
    try {
      logger.publish(4, `${collectionName}`, 'parseMessage:req', {
        nativeSensorId: encoded.nativeSensorId,
      });
      if (
        (encoded.devEui || encoded.devAddr) &&
        encoded.nativeSensorId &&
        (encoded.type || encoded.resource)
      ) {
        const device = await Device.findByPattern(pattern, encoded);
        if (!device || device === null) return null;
        await device.updateAttributes({
          frameCounter: device.frameCounter + 1 || 1,
          lastSignal: encoded.lastSignal || new Date(),
        });
        const Sensor = Device.app.models.Sensor;
        const tempSensor = await Sensor.compose(
          device,
          encoded,
        );
        if (encoded.method === 'GET') {
          return Sensor.getInstance(tempSensor);
        } else if (encoded.method === 'HEAD') {
          return Sensor.handlePresentation(device, tempSensor, encoded);
        } else if (encoded.method === 'POST' || encoded.method === 'PUT') {
          return Sensor.createOrUpdate(device, tempSensor, encoded);
        } else if (encoded.method === 'STREAM') {
          return Sensor.publish(tempSensor, encoded.method);
        }
        throw new Error('Unsupported method');
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
   * @param {object} pattern - Pattern detected by Iot-Agent
   * @param {object} packet - MQTT bridge packet
   * @returns {functions} parseMessage
   */
  Device.onPublish = async (pattern, packet) => {
    try {
      // logger.publish(4, `${collectionName}`, 'onPublish:req', pattern);
      if (!pattern || !pattern.params || !pattern.name) {
        throw new Error('Missing argument');
      }
      const encoded = await iotAgent.encode(packet, pattern);
      if (!encoded) throw new Error('No encoded result');
      return parseMessage(pattern, encoded);
    } catch (error) {
      logger.publish(4, `${collectionName}`, 'onPublish:err', error);
      return error;
    }
  };

  /**
   * Create new token, and update Device instance
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
        await Device.app.models.accessToken.destroyById(device.apiKey);
        const token = await device.accessTokens.create({
          devEui: device.devEui,
          devAddr: device.devAddr,
          userId: device.id,
          ttl: -1,
        });
        // publish new apiKey to target device ?
        await device.updateAttribute('apiKey', token.id.toString());
        return device;
      }
      throw new Error('Missing Device instance');
    } catch (error) {
      logger.publish(4, `${collectionName}`, 'refreshToken:err', error);
      return error;
    }
  };

  /**
   * Update device status from MQTT conection status
   * @method module:Broker~updateDeviceStatus
   * @param {object} client - MQTT client
   * @param {boolean} status - MQTT conection status
   * @returns {function}
   */
  Device.updateStatus = async (client, status) => {
    try {
      let idProp;
      if (client.devEui && client.devEui !== null && client.id.startsWith(client.devEui)) {
        idProp = 'devEui';
      } else if (
        client.devAddr &&
        client.devAddr !== null &&
        client.id.startsWith(client.devAddr)
      ) {
        idProp = 'devAddr';
      }
      if (!idProp) return null;
      const device = await Device.findById(client.user);
      if (device && device !== null) {
        if (status) {
          //  await device.updateAttribute('status', true);
          await device.updateAttributes({ frameCounter: 1, status: true, lastSignal: new Date() });
        } else {
          await device.updateAttributes({ frameCounter: 0, status: false, lastSignal: new Date() });
        }
      }
      return null;
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

  //  Device.createAuthLink = (account, deviceId, method) => {
  // check that this device is owned by account
  // then get device.apiKey
  // if method === "qrcode"
  // generate a url
  // if method === "nfc"
  //
  //  };
};
