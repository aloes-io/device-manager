import iotAgent from 'iot-agent';
import { updateAloesSensors } from 'aloes-handlers';
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
      this.transportProtocol.toLowerCase() === 'aloesclient' ||
      this.transportProtocol.toLowerCase() === 'aloeslight' ||
      this.transportProtocol.toLowerCase() === 'mysensors' ||
      this.transportProtocol.toLowerCase() === 'lorawan'
    ) {
      return;
    }
    err();
  }

  function messageProtocolValidator(err) {
    if (
      this.messageProtocol.toLowerCase() === 'aloesclient' ||
      this.messageProtocol.toLowerCase() === 'aloeslight' ||
      this.messageProtocol.toLowerCase() === 'mysensors' ||
      this.messageProtocol.toLowerCase() === 'cayennelpp'
    ) {
      return;
    }
    err();
  }

  function typeValidator(err) {
    if (
      this.type.toLowerCase() === 'gateway' ||
      this.type.toLowerCase() === 'node' ||
      this.type.toLowerCase() === 'phone' ||
      this.type.toLowerCase() === 'camera' ||
      this.type.toLowerCase() === 'browser' ||
      this.type.toLowerCase() === 'bot'
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

  Device.validatesUniquenessOf('devEui', { scopedTo: ['ownerId'] });
  // Device.validatesDateOf("lastSignal", {message: "lastSignal is not a date"});

  /**
   * Event reporting that a device instance will be created or updated.
   * @event before save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Device instance
   */
  Device.observe('before save', async ctx => {
    logger.publish(5, `${collectionName}`, 'beforeSave:req', ctx.instance);
    logger.publish(5, `${collectionName}`, 'beforeSave:req', ctx.data);
    try {
      let device;
      if (ctx.data) {
        device = ctx.data;
      } else if (ctx.instance) {
        device = ctx.instance;
      }
      // else if (ctx.currentInstance) {
      //   device = ctx.currentInstance;
      // }
      //  make a list properties to watch =>
      //  todo update sensor properties when they exists (ex:transportProtocol )
      if (device.transportProtocol && device.transportProtocol !== null) {
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
            console.log(device);
        }
      }
      //  logger.publish(3, `${collectionName}`, "beforeSave:res1", device);

      switch (device.type) {
        case 'bot':
          //  device.icons[0] = `${process.env.HTTP_CLIENT_URL}/icons/aloes/bot.png`;
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
        case 'node':
          device.icons[0] = `/icons/aloes/node.png`;
          device.icons[1] = `/icons/aloes/node-white.png`;
          break;
        case 'phone':
          device.icons[0] = `/icons/aloes/phone.png`;
          device.icons[1] = `/icons/aloes/phone-white.png`;
          break;
        default:
          console.log(device.type);
      }
      logger.publish(4, collectionName, 'beforeSave:res', device);
      return device;
    } catch (error) {
      logger.publish(3, `${collectionName}`, 'beforeSave:err', error);
      return error;
    }
  });

  const createToken = async device => {
    try {
      let token;
      if (device.devEui && device.devEui !== null) {
        token = await device.accessTokens.create({
          devEui: device.devEui,
          //  userId: device.id,
          ttl: -1,
        });
      } else if (device.devAddr && device.devAddr !== null) {
        token = await device.accessTokens.create({
          devAddr: device.devAddr,
          //  userId: device.id,
          ttl: -1,
        });
      } else {
        throw new Error('no DevEui and no DevAddr');
      }
      return token;
    } catch (error) {
      return error;
    }
  };

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
      const packet = await iotAgent.publish({
        userId: ctx.instance.ownerId,
        collectionName,
        data: ctx.instance,
        method: 'POST',
        pattern: 'aloesClient',
      });
      if (packet && packet.topic && packet.payload) {
        return Device.app.publish(packet.topic, packet.payload);
      }
      return null;
    } catch (error) {
      return error;
    }
  };

  const updateDeviceProps = async ctx => {
    try {
      const token = await ctx.instance.accessTokens.findById(ctx.instance.apiKey);
      if (!token || token === null) throw new Error('Device API key not found');
      //  if (!token || token === null) token = await createToken(ctx.instance);
      if (ctx.instance.devEui !== null) {
        token.updateAttribute('devEui', ctx.instance.devEui);
        const sensors = ctx.instance.sensors();
        if (sensors && sensors !== null) {
          await Device.app.models.Sensor.updateAll(
            { deviceId: ctx.instance.id },
            {
              devEui: ctx.instance.devEui,
              transportProtocol: ctx.instance.transportProtocol,
              transportProtocolVersion: ctx.instance.transportProtocolVersion,
              messageProtocol: ctx.instance.messageProtocol,
              messageProtocolVersion: ctx.instance.messageProtocolVersion,
            },
          );
        }
        logger.publish(4, `${collectionName}`, 'updateDeviceProps:res', {
          token,
        });
      }
      if (ctx.instance.devAddr !== null) {
        token.updateAttribute('devAddr', ctx.instance.devAddr);
        const sensors = ctx.instance.sensors();
        if (sensors && sensors !== null && sensors.length > 0) {
          await Device.app.models.Sensor.updateAll(
            { deviceId: ctx.instance.id },
            {
              devAddr: ctx.instance.devAddr,
              transportProtocol: ctx.instance.transportProtocol,
              transportProtocolVersion: ctx.instance.transportProtocolVersion,
              messageProtocol: ctx.instance.messageProtocol,
              messageProtocolVersion: ctx.instance.messageProtocolVersion,
            },
          );
        }
        logger.publish(4, `${collectionName}`, 'updateDeviceProps:res', {
          token,
        });
      }
      const packet = await iotAgent.publish({
        userId: ctx.instance.ownerId,
        collectionName,
        data: ctx.instance,
        modelId: ctx.instance.id,
        method: 'PUT',
        pattern: 'aloesClient',
      });
      if (packet && packet.topic && packet.payload) {
        return Device.app.publish(packet.topic, packet.payload);
      }
      throw new Error('no packet payload to publish');
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
      if (ctx.instance && Device.app) {
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
   * Event reporting that a device instance will be deleted.
   * @event before save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Device instance
   */
  Device.observe('before delete', async ctx => {
    try {
      const instance = await ctx.Model.findById(ctx.where.id);
      logger.publish(4, `${collectionName}`, 'beforeDelete:req', instance.id);
      await Device.app.models.Address.destroyAll({
        deviceId: instance.id,
      });
      await Device.app.models.accessToken.destroyById(instance.apiKey);
      await Device.app.models.Sensor.destroyAll({
        deviceId: instance.id,
      });

      if (instance && instance.ownerId && Device.app) {
        const packet = await iotAgent.publish({
          userId: instance.ownerId,
          collectionName,
          data: instance,
          method: 'DELETE',
          pattern: 'aloesClient',
        });
        if (packet && packet.topic && packet.payload) {
          return Device.app.publish(packet.topic, packet.payload);
        }
        throw new Error('no packet payload to publish');
      }
      throw new Error('no instance to delete');
    } catch (error) {
      return error;
    }
  });

  /**
   * Find device related to incoming MQTT packet
   * @param {object} pattern - IotAgent parsed pattern
   * @param {object} encoded - IotAgent parsed message
   * @returns {object} device
   */
  const findDeviceByPattern = async (pattern, encoded) => {
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
      logger.publish(4, `${collectionName}`, 'findDeviceByPattern:res', {
        deviceId: device.id,
      });
      return device;
    } catch (error) {
      return error;
    }
  };

  /**
   * When device found, create or update sensor instance
   * @param {object} device - found device instance
   * @param {object} encoded - IotAgent parsed message
   * @returns {object} sensor
   */
  const composeSensor = (device, encoded) => {
    try {
      let sensor = {};
      if ((!device.sensors() || !device.sensors()[0]) && encoded.type) {
        sensor = {
          //  ...encoded,
          name: encoded.name || null,
          type: encoded.type,
          resources: encoded.resources,
          icons: encoded.icons,
          colors: encoded.colors,
          nativeType: encoded.nativeType,
          nativeResource: encoded.nativeResource,
          nativeSensorId: encoded.nativeSensorId,
          nativeNodeId: encoded.nativeNodeId || null,
          frameCounter: encoded.frameCounter || 0,
          inPrefix: encoded.inPrefix || null,
          outPrefix: encoded.outPrefix || null,
          inputPath: encoded.inputPath || null,
          outputPath: encoded.outputPath || null,
          transportProtocol: device.transportProtocol,
          transportProtocolVersion: device.transportProtocolVersion,
          messageProtocol: device.messageProtocol,
          messageProtocolVersion: device.messageProtocolVersion,
          devEui: device.devEui,
          devAddr: device.devAddr,
          ownerId: device.ownerId,
          isNewInstance: true,
        };
        logger.publish(4, `${collectionName}`, 'composeSensor:new', {
          sensor,
        });
        return sensor;
      } else if (device.sensors()[0] && device.sensors()[0].id) {
        sensor = device.sensors()[0];
        logger.publish(4, `${collectionName}`, 'composeSensor:update', {
          sensor,
        });
        sensor.isNewInstance = false;
        //  sensor.name = encoded.name;
        //  sensor.resource = encoded.resource;
        sensor.description = encoded.description;
        sensor.inPrefix = encoded.inPrefix || null;
        sensor.outPrefix = encoded.outPrefix || null;
        sensor.inputPath = encoded.inputPath || null;
        sensor.outputPath = encoded.outputPath || null;
        sensor.devEui = device.devEui;
        sensor.devAddr = device.devAddr;
        sensor.transportProtocol = device.transportProtocol;
        sensor.transportProtocolVersion = device.transportProtocolVersion;
        sensor.messageProtocol = device.messageProtocol;
        sensor.messageProtocolVersion = device.messageProtocolVersion;
        return sensor;
      }
      throw new Error('no sensor found and no known type to register a new one');
    } catch (error) {
      return error;
    }
  };

  /**
   * When GET method detected, find and publish instance
   * @param {object} pattern - IotAgent detected pattern
   * @param {object} sensor - Incoming sensor instance
   * @returns {object} sensor
   * @returns {function} app.publish
   */
  const getInstance = async (pattern, sensor) => {
    try {
      let packet = {
        topic: `${sensor.ownerId}/IoTAgent/GET`,
        payload: JSON.stringify(sensor),
      };
      if (pattern.name.toLowerCase() !== 'aloesclient') {
        packet = await iotAgent.decode(packet, pattern.params);
      }
      if (packet.payload && packet.payload !== null) {
        //  console.log('getInstance res:', topic, payload);
        return Device.app.publish(packet.topic, packet.payload, false, 0);
      }
      throw new Error('no packet payload to publish');
    } catch (error) {
      return error;
    }
  };

  /**
   * When HEAD detected, validate sensor.resource and value, then save sensor instance
   * @param {object} device - found device instance
   * @param {object} sensor - Incoming sensor instance
   * @param {object} encoded - IotAgent parsed message
   * @returns {function} sensor.create
   * @returns {function} sensor.updateAttributes
   */
  const handleSensorPresentation = async (device, sensor, encoded) => {
    try {
      logger.publish(4, `${collectionName}`, 'handleSensorPresentation:req', {
        deviceId: device.id,
      });
      sensor.frameCounter = 0;
      if (encoded.resource) {
        sensor.resource = Number(encoded.resource);
      }
      if (sensor.isNewInstance && sensor.icons) {
        sensor.method = 'HEAD';
        return device.sensors.create(sensor);
      } else if (sensor.id) {
        const updatedSensor = await device.sensors.findById(sensor.id);
        if (!updatedSensor) throw new Error('Sensor not found');
        delete sensor.id;
        updatedSensor.method = 'HEAD';
        if (!updatedSensor.resource) {
          updatedSensor.resource = sensor.resource;
        }
        return updatedSensor.save();
      }
      throw new Error('no valid sensor to register');
    } catch (error) {
      return error;
    }
  };

  /**
   * When POST or PUT method detected, validate sensor.resource and value, then save sensor instance
   * @param {object} device - found device instance
   * @param {object} sensor - Incoming sensor instance
   * @param {object} encoded - IotAgent parsed message
   * @returns {function} sensor.create
   * @returns {function} sensor.updateAttributes
   */
  const createOrUpdateSensor = async (device, sensor, encoded) => {
    try {
      logger.publish(4, `${collectionName}`, 'createOrUpdateSensor:req', {
        sensorId: sensor.id,
      });
      if (sensor.isNewInstance) throw new Error('Sensor not created yet');
      sensor.frameCounter += 1;
      if (sensor.id) {
        const updatedSensor = await device.sensors.findById(sensor.id);
        if (encoded.value && encoded.resource) {
          sensor = await updateAloesSensors(sensor, Number(encoded.resource), encoded.value);
          sensor.method = encoded.method;
          // await updatedSensor.measurements.create({
          //   date: sensor.lastSignal,
          //   type: typeof sensor.resources[resource],
          //   omaObjectId: sensor.type,
          //   omaResourceId: sensor.resource,
          //   deviceId: sensor.deviceId,
          //   value: sensor.value,
          // });
        }
        logger.publish(4, `${collectionName}`, 'createOrUpdateSensor:res', {
          inType: typeof encoded.value,
          outType: typeof sensor.value,
        });
        delete sensor.id;
        return updatedSensor.updateAttributes(sensor);
      }
      throw new Error('no valid sensor to update');
    } catch (error) {
      return error;
    }
  };

  /**
   * Find properties and dispatch to the right function
   * @param {object} pattern - Pattern detected by IotAgent
   * @param {object} encoded - IotAgent parsed message
   * @returns {functions} getInstance
   * @returns {functions} createOrUpdateSensor
   */
  const parseMessage = async (pattern, encoded) => {
    try {
      logger.publish(5, `${collectionName}`, 'parseMessage:req', {
        nativeSensorId: encoded.nativeSensorId,
      });
      if (
        (encoded.devEui || encoded.devAddr) &&
        encoded.nativeSensorId &&
        (encoded.type || encoded.resource)
      ) {
        const device = await findDeviceByPattern(pattern, encoded);
        if (!device || device === null) return null;
        const tempSensor = await composeSensor(device, encoded);
        //  console.log('sensor nativeId:', tempSensor.nativeSensorId);
        if (encoded.method === 'GET') {
          return getInstance(tempSensor);
        } else if (encoded.method === 'HEAD') {
          return handleSensorPresentation(device, tempSensor, encoded);
        } else if (encoded.method === 'POST' || encoded.method === 'PUT') {
          return createOrUpdateSensor(device, tempSensor, encoded);
          // await device.updateAttributes({
          //   frameCounter: device.frameCounter + 1 || 1,
          //   lastSignal: encoded.lastSignal || new Date(),
          // });
        } else if (encoded.method === 'STREAM') {
          //  console.log('streaming sensor:');
          const stream = await iotAgent.publish({
            userId: device.ownerId,
            collectionName: 'Sensor',
            data: tempSensor.value,
            method: 'STREAM',
            pattern: 'aloesClient',
          });
          return Device.app.publish(stream.topic, stream.payload);
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
  Device.refreshToken = async device => {
    try {
      logger.publish(4, `${collectionName}`, 'refreshToken:req', device.id);
      if (!device.id) throw new Error('missing device.id');
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

  const findDevice = async whereFilter =>
    new Promise((resolve, reject) => {
      Device.app.models.find(whereFilter, (err, profiles) =>
        err ? reject(err) : resolve(profiles),
      );
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
      //  if (process.env.NODE_ENV.toString() === "development") return null;
      if (!ctx.req.accessToken.userId || (!filter.name && !filter.place)) {
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
      let deviceAddresses = await addresses.filter(address => address.deviceId);
      logger.publish(4, `${collectionName}`, 'geoLocate:res', deviceAddresses);
      if (deviceAddresses.length > 0) {
        deviceAddresses = await utils.composeGeoLocateResult(collectionName, addresses);
      }
      return deviceAddresses;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'geoLocate:err', error);
      return error;
      //  next(error);
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
