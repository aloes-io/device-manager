import iotAgent from 'iot-agent';
import { updateAloesSensors } from 'aloes-handlers';
import logger from '../services/logger';

/**
 * @module Sensor
 */
module.exports = function(Sensor) {
  const collectionName = 'Sensor';
  const filteredProperties = ['children', 'size', 'show', 'group', 'success', 'error'];

  function typeValidator(err) {
    if (this.type.toString().length === 4) {
      return;
    }
    err();
  }

  function transportProtocolValidator(err) {
    if (
      this.transportProtocol.toLowerCase() === 'aloes' ||
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
      this.messageProtocol.toLowerCase() === 'aloes' ||
      this.messageProtocol.toLowerCase() === 'aloeslight' ||
      this.messageProtocol.toLowerCase() === 'mysensors' ||
      this.messageProtocol.toLowerCase() === 'cayennelpp'
    ) {
      return;
    }
    err();
  }

  Sensor.validatesPresenceOf('deviceId');

  Sensor.validatesPresenceOf('ownerId');

  Sensor.validate('type', typeValidator, {
    message: 'Wrong sensor type',
  });

  Sensor.validate('transportProtocol', transportProtocolValidator, {
    message: 'Wrong transport protocol name',
  });

  Sensor.validate('messageProtocol', messageProtocolValidator, {
    message: 'Wrong application protocol name',
  });

  /**
   * Event reporting that a sensor instance will be created or updated.
   * @event before save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Sensor instance
   */
  Sensor.observe('before save', async ctx => {
    try {
      if (ctx.options && ctx.options.skipPropertyFilter) return ctx;
      if (ctx.instance) {
        logger.publish(5, `${collectionName}`, 'beforeSave:req', '');
        const promises = await filteredProperties.map(async p => ctx.instance.unsetAttribute(p));
        await Promise.all(promises);
      } else if (ctx.data) {
        logger.publish(5, `${collectionName}`, 'beforePartialSave:req', '');
        ctx.hookState.updateData = ctx.data;
        const promises = await filteredProperties.map(p => delete ctx.data[p]);
        await Promise.all(promises);
      }

      return ctx;
    } catch (error) {
      return error;
    }
  });

  /**
   * Find Sensor instance from the cache
   * @method module:Sensor.getCache
   * @param {string} deviceId - Device Id owning the sensor
   * @param {string} sensorId - Sensor instance Id
   * @returns {object} sensor
   */
  Sensor.getCache = async (deviceId, sensorId) => {
    try {
      const SensorResource = Sensor.app.models.SensorResource;
      const resourceKey = `deviceId-${deviceId}-sensorId-${sensorId}`;
      const cachedSensor = await SensorResource.get(resourceKey);
      if (cachedSensor && cachedSensor !== null) {
        return JSON.parse(cachedSensor);
      }
      throw new Error('No sensor found in cache');
    } catch (error) {
      return error;
    }
  };

  /**
   * Create or update sensor instance into the cache memory
   * @method module:Sensor.setCache
   * @param {string} deviceId - Device Id owning the sensor
   * @param {object} sensor - Sensor instance to save
   * @param {number} [ttl] - Sensor instance Id
   * @returns {object} sensor
   */
  Sensor.setCache = async (deviceId, sensor, ttl) => {
    try {
      const SensorResource = Sensor.app.models.SensorResource;
      const key = `deviceId-${deviceId}-sensorId-${sensor.id}`;
      const promises = await filteredProperties.map(p => delete sensor[p]);
      await Promise.all(promises);
      if (typeof sensor !== 'string') {
        sensor = JSON.stringify(sensor);
      }
      if (ttl && ttl !== null) {
        await SensorResource.set(key, sensor, ttl);
      } else {
        await SensorResource.set(key, sensor);
      }
      return sensor;
    } catch (error) {
      return error;
    }
  };

  /**
   * Set TTL for a sensor store in cache
   * @method module:Sensor.expireCache
   * @param {string} deviceId - Device Id owning the sensor
   * @param {object} sensor - Sensor instance to save
   * @param {number} [ttl] - Sensor instance Id
   * @returns {object} sensor
   */
  Sensor.expireCache = async (deviceId, sensorId, ttl) => {
    try {
      const SensorResource = Sensor.app.models.SensorResource;
      const key = `deviceId-${deviceId}-sensorId-${sensorId}`;
      if (!ttl) {
        ttl = 1;
      }
      await SensorResource.expire(key, ttl);
      return true;
    } catch (error) {
      return error;
    }
  };

  /**
   * Synchronize cache memory with database on disk
   * @method module:Sensor.syncCache
   * @param {object} device - Device Instance to sync
   * @param {string} [direction] - UP to save on disk | DOWN to save on cache,
   */
  Sensor.syncCache = async (device, direction = 'UP') => {
    try {
      const sensors = await device.sensors.find();
      if (sensors && sensors !== null) {
        if (direction === 'UP') {
          // sync redis with mongo
          const result = await sensors.map(async sensor => {
            const cachedSensor = await Sensor.getCache(device.id, sensor.id);
            if (cachedSensor && cachedSensor !== null) {
              delete cachedSensor.id;
              return sensor.updateAttributes(cachedSensor);
            }
            return null;
          });
          await Promise.all(result);
        } else if (direction === 'DOWN') {
          // sync mongo with redis
          const result = await sensors.map(async sensor => Sensor.setCache(device.id, sensor));
          await Promise.all(result);
        }
      }
      return null;
    } catch (error) {
      return error;
    }
  };

  /**
   * Format packet and send it via MQTT broker
   * @method module:Sensor~createToken
   * @param {object} sensor - Sensor instance
   * @param {string} [method] - MQTT method
   * returns {function} Sensor.app.publish()
   */
  Sensor.publish = async (sensor, method) => {
    try {
      let packet;
      if (sensor.isNewInstance) {
        packet = await iotAgent.publish({
          userId: sensor.ownerId,
          collectionName,
          modelId: sensor.id,
          data: sensor,
          method: method || sensor.method,
          pattern: 'aloesClient',
        });
      } else {
        packet = await iotAgent.publish({
          userId: sensor.ownerId,
          collectionName,
          data: sensor,
          modelId: sensor.id,
          method: method || sensor.method,
          pattern: 'aloesClient',
        });
      }
      if (packet && packet.topic && packet.payload) {
        logger.publish(4, `${collectionName}`, 'publish:res', {
          topic: packet.topic,
        });
        // const pattern = await iotAgent.patternDetector(packet);
        // //  console.log('pattern :', pattern);
        // let nativePacket = { topic: packet.topic, payload: JSON.stringify(sensor) };
        // nativePacket = await iotAgent.decode(nativePacket, pattern.params);
        // if (nativePacket.payload && nativePacket.payload !== null) {
        //   //     await Device.app.publish(nativePacket.topic, nativePacket.payload, false, 1);
        // }
        // console.log('sensor nativePacket (not published)', nativePacket.topic);
        return Sensor.app.publish(packet.topic, packet.payload, false, 0);
      }
      throw new Error('Invalid MQTT Packet encoding');
    } catch (error) {
      return error;
    }
  };

  /**
   * Event reporting that a sensor instance has been created or updated.
   * @event after save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Sensor instance
   */
  Sensor.observe('after save', async ctx => {
    try {
      logger.publish(4, `${collectionName}`, 'afterSave:req', '');
      if (ctx.hookState.updateData) {
        return ctx;
      } else if (ctx.instance.id && !ctx.isNewInstance && ctx.instance.ownerId) {
        await Sensor.setCache(ctx.instance.deviceId, ctx.instance);
      }
      return ctx;
    } catch (error) {
      return error;
    }
  });

  /**
   * Event reporting that a sensor instance will be deleted.
   * @event before delete
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.where.id - Sensor id
   */
  Sensor.observe('before delete', async ctx => {
    try {
      logger.publish(4, `${collectionName}`, 'beforeDelete:req', ctx.where);
      if (ctx.where.id) {
        const instance = await ctx.Model.findById(ctx.where.id);
        await Sensor.app.models.Measurement.destroyAll({
          sensorId: { like: new RegExp(`.*${ctx.where.id}.*`, 'i') },
        });
        if (!instance || instance == null) {
          throw new Error('no instance to delete');
        }

        await Sensor.expireCache(instance.deviceId, instance.id, 1);

        await Sensor.publish(instance, 'DELETE');
        return ctx;
      }
      throw new Error('no instance to delete');
    } catch (error) {
      return error;
    }
  });

  /**
   * When device found,validate sensor instance produced by IoTAgent
   * @method module:Sensor.compose
   * @param {object} device - found device instance
   * @param {object} encoded - IotAgent parsed message
   * @returns {object} sensor
   */
  Sensor.compose = async (device, encoded) => {
    try {
      let sensor = {};
      if ((!device.sensors() || !device.sensors()[0]) && encoded.type) {
        sensor = {
          //  ...encoded,
          name: encoded.name || null,
          type: encoded.type,
          lastSignal: encoded.lastSignal,
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
        logger.publish(5, `${collectionName}`, 'compose:new', {
          sensor,
        });
        let newSensor = await device.sensors.create(sensor);
        newSensor = JSON.parse(JSON.stringify(newSensor));
        return newSensor;
      } else if (device.sensors()[0] && device.sensors()[0].id) {
        sensor = device.sensors()[0];
        sensor.isNewInstance = false;
        sensor.name = encoded.name;
        sensor.type = encoded.type;
        //  sensor.resource = encoded.resource;
        sensor.lastSignal = encoded.lastSignal;
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
        sensor.ownerId = device.ownerId;
        logger.publish(5, `${collectionName}`, 'compose:update', {
          sensor,
        });
        sensor = JSON.parse(JSON.stringify(sensor));
        return sensor;
      }
      throw new Error('no sensor found and no known type to register a new one');
    } catch (error) {
      return error;
    }
  };

  /**
   * Update device's sensors stored in cache
   * @method module:Sensor~updateCache
   * @param {object} device - Device instance
   * returns {array} sensor
   */
  Sensor.updateCache = async device => {
    try {
      const SensorResource = Sensor.app.models.SensorResource;
      const sensors = [];
      const iterator = await SensorResource.iterateKeys({
        match: `deviceId-${device.id}-sensorId-*`,
      });
      await Promise.resolve()
        .then(() => iterator.next())
        .then(async key => {
          try {
            if (key && key !== undefined) {
              let sensor = JSON.parse(await SensorResource.get(key));
              sensor = {
                ...sensor,
                devEui: device.devEui,
                devAddr: device.devAddr,
                transportProtocol: device.transportProtocol,
                transportProtocolVersion: device.transportProtocolVersion,
                messageProtocol: device.messageProtocol,
                messageProtocolVersion: device.messageProtocolVersion,
              };
              await Sensor.setCache(device.id, sensor);
              sensors.push(sensor);
            }
            return iterator.next();
          } catch (error) {
            return error;
          }
        });

      // const sensorsKeys = await SensorResource.keys({
      //   match: `deviceId-${device.id}-sensorId-*`,
      // });
      // const promises = await sensorsKeys.map(async key => {
      //   // let sensor = JSON.parse(await SensorResource.get(key));
      //   let sensor = await Sensor.getCache(device.id, sensorId);

      //   sensor = {
      //     ...sensor,
      //     devEui: device.devEui,
      //     devAddr: device.devAddr,
      //     transportProtocol: device.transportProtocol,
      //     transportProtocolVersion: device.transportProtocolVersion,
      //     messageProtocol: device.messageProtocol,
      //     messageProtocolVersion: device.messageProtocolVersion,
      //   };
      //   await SensorResource.set(key, JSON.stringify(sensor));
      //   //  await Sensor.publish(sensor, 'HEAD');
      //   return sensor;
      // });

      //  const sensors = await Promise.all(promises);
      return sensors;
    } catch (error) {
      return error;
    }
  };

  /**
   * When HEAD detected, validate sensor.resource and value, then save sensor instance
   * @method module:Sensor.handlePresentation
   * @param {object} device - found device instance
   * @param {object} sensor - Incoming sensor instance
   * @param {object} encoded - IotAgent parsed message
   * @returns {function} sensor.create
   * @returns {function} sensor.updateAttributes
   */
  Sensor.handlePresentation = async (device, sensor, encoded) => {
    try {
      logger.publish(4, `${collectionName}`, 'handlePresentation:req', {
        deviceId: device.id,
      });
      if (encoded.resource) {
        sensor.resource = Number(encoded.resource);
      }
      if (sensor.isNewInstance && sensor.icons) {
        sensor.method = 'HEAD';
        await Sensor.setCache(device.id, sensor);
        return Sensor.publish(sensor, 'HEAD');
      } else if (!sensor.isNewInstance && sensor.id) {
        let updatedSensor = await Sensor.getCache(device.id, sensor.id);
        if (!updatedSensor) throw new Error('Sensor not found');
        updatedSensor = { ...updatedSensor, ...sensor };
        updatedSensor.method = 'HEAD';
        updatedSensor.frameCounter = 0;
        await Sensor.setCache(device.id, updatedSensor);
        return Sensor.publish(updatedSensor, 'HEAD');
      }
      throw new Error('no valid sensor to register');
    } catch (error) {
      return error;
    }
  };

  /**
   * When POST or PUT method detected, validate sensor.resource and value, then save sensor instance
   * @method module:Sensor.createOrUpdate
   * @param {object} device - found device instance
   * @param {object} sensor - Incoming sensor instance
   * @param {object} encoded - IotAgent parsed message
   * @returns {function} sensor.create
   * @returns {function} sensor.updateAttributes
   */
  Sensor.createOrUpdate = async (device, sensor, encoded) => {
    try {
      logger.publish(4, `${collectionName}`, 'createOrUpdate:req', {
        sensorId: sensor.id,
      });
      if (sensor.isNewInstance) throw new Error('Sensor not created yet');
      if (sensor.id) {
        const SensorResource = Sensor.app.models.SensorResource;
        const resourceKey = `deviceId-${device.id}-sensorId-${sensor.id}`;
        const cachedSensor = await SensorResource.get(resourceKey);
        let updatedSensor = JSON.parse(cachedSensor);
        //  console.log('cached sensor', cachedSensor);
        if (!updatedSensor) throw new Error('Sensor not found');
        updatedSensor = { ...updatedSensor, ...sensor };
        if (encoded.value && encoded.resource) {
          updatedSensor = await updateAloesSensors(
            updatedSensor,
            Number(encoded.resource),
            encoded.value,
          );
          // await updatedSensor.measurements.create({
          //   date: sensor.lastSignal,
          //   type: typeof sensor.resources[resource],
          //   objectId: sensor.type,
          //   resourceId: sensor.resource,
          //   deviceId: sensor.deviceId,
          //   value: sensor.value,
          // });
        }
        logger.publish(5, `${collectionName}`, 'createOrUpdate:res', {
          inType: typeof encoded.value,
          outType: typeof updatedSensor.value,
        });
        updatedSensor.method = encoded.method;
        updatedSensor.frameCounter += 1;
        const lastSignal = encoded.lastSignal.getTime();
        // console.log(
        //   'counter, last sync , last signal',
        //   updatedSensor.frameCounter,
        //   updatedSensor.lastSync,
        //   lastSignal,
        // );
        if (!updatedSensor.lastSync) {
          updatedSensor.lastSync = lastSignal;
        }
        // TODO : Define cache delay with env vars
        if (updatedSensor.frameCounter % 25 === 0) {
          updatedSensor.lastSync = lastSignal;
          delete updatedSensor.id;
          updatedSensor = await device.sensors.updateById(sensor.id, updatedSensor);
        } else if (lastSignal > updatedSensor.lastSync + 30 * 1000) {
          updatedSensor.lastSync = lastSignal;
          delete updatedSensor.id;
          updatedSensor = await device.sensors.updateById(sensor.id, updatedSensor);
        } else {
          await Sensor.setCache(device.id, updatedSensor);
          //  await SensorResource.set(resourceKey, JSON.stringify(updatedSensor));
        }
        return Sensor.publish(updatedSensor, 'PUT');
      }
      throw new Error('no valid sensor to update');
    } catch (error) {
      return error;
    }
  };

  /**
   * When GET method detected, find and publish instance
   * @method module:Sensor.getInstance
   * @param {object} pattern - IotAgent detected pattern
   * @param {object} sensor - Incoming sensor instance
   * @returns {function} Sensor.publish
   */
  Sensor.getInstance = async (pattern, sensor) => {
    try {
      // const resourceKey = `deviceId-${sensor.deviceId}-sensorId-${sensor.id}`;
      // const cachedSensor = await Sensor.app.models.SensorResource.get(resourceKey);
      // let instance = JSON.parse(cachedSensor);
      let instance = Sensor.getCache(sensor.deviceId, sensor.id);
      if (!instance) {
        instance = await Sensor.findById(sensor.id);
      }
      logger.publish(4, `${collectionName}`, 'getInstance:res', {
        pattern,
      });
      if (!instance) throw new Error('Sensor not found');
      // if (pattern.name.toLowerCase() !== 'aloesclient') {
      //   let packet = { payload: JSON.stringify(instance) };
      //   packet = await iotAgent.decode(packet, pattern.params);
      //   if (packet.payload && packet.payload !== null) {
      //     return Sensor.app.publish(packet.topic, packet.payload, false, 1);
      //   }
      //   throw new Error('no packet payload to publish');
      // }
      return Sensor.publish(instance, 'GET');
    } catch (error) {
      return error;
    }
  };
};
