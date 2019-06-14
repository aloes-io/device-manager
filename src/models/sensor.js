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
        const promises = await filteredProperties.map(async p => ctx.instance.unsetAttribute(p));
        await Promise.all(promises);
      } else {
        const promises = await filteredProperties.map(p => delete ctx.data[p]);
        await Promise.all(promises);
      }
      return ctx;
    } catch (error) {
      return error;
    }
  });

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
      logger.publish(4, `${collectionName}`, 'afterSave:req', ctx.instance.id);
      if (ctx.instance.id && ctx.instance.ownerId && Sensor.app.broker) {
        //  await publish(ctx.instance);
      }
      return null;
      //  throw new Error('Invalid Sensor instance');
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
        const cacheKey = `deviceId-${instance.deviceId}-sensorId-${instance.id}`;
        await Sensor.app.models.SensorResource.set(cacheKey, null, { ttl: 1 });
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
        return sensor;
      } else if (device.sensors()[0] && device.sensors()[0].id) {
        sensor = device.sensors()[0];
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
        logger.publish(5, `${collectionName}`, 'compose:update', {
          sensor,
        });
        return sensor;
      }
      throw new Error('no sensor found and no known type to register a new one');
    } catch (error) {
      return error;
    }
  };

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
        return Sensor.app.publish(packet.topic, packet.payload, false, 1);
      }
      throw new Error('Invalid MQTT Packet encoding');
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
      const SensorResource = Sensor.app.models.SensorResource;
      if (sensor.isNewInstance && sensor.icons) {
        sensor.method = 'HEAD';
        const newSensor = await device.sensors.create(sensor);
        const resourceKey = `deviceId-${device.id}-sensorId-${sensor.id}`;
        // await Sensor.app.models.SensorResource.set(resourceKey, JSON.stringify(newSensor), {
        //   ttl: 10000,
        // });
        await SensorResource.set(resourceKey, JSON.stringify(newSensor));
        return Sensor.publish(newSensor, 'HEAD');
      } else if (sensor.id) {
        const resourceKey = `deviceId-${device.id}-sensorId-${sensor.id}`;
        const cachedSensor = await SensorResource.get(resourceKey);
        let updatedSensor = JSON.parse(cachedSensor);
        if (!updatedSensor) {
          updatedSensor = await Sensor.findById(sensor.id);
        }
        if (!updatedSensor) throw new Error('Sensor not found');
        updatedSensor.method = 'HEAD';
        if (!updatedSensor.resource) {
          updatedSensor.resource = sensor.resource;
        }
        updatedSensor.frameCounter = 0;
        await SensorResource.set(resourceKey, JSON.stringify(updatedSensor));
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
        if (!updatedSensor) {
          updatedSensor = await Sensor.findById(sensor.id);
          // updatedSensor = await device.sensors.findById(sensor.id);
        }
        if (!updatedSensor) throw new Error('Sensor not found');

        if (encoded.value && encoded.resource) {
          updatedSensor = await updateAloesSensors(
            updatedSensor,
            Number(encoded.resource),
            encoded.value,
          );
          // await updatedSensor.measurements.create({
          //   date: sensor.lastSignal,
          //   type: typeof sensor.resources[resource],
          //   omaObjectId: sensor.type,
          //   omaResourceId: sensor.resource,
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
        if (updatedSensor.frameCounter % 25 === 0) {
          updatedSensor.lastSync = lastSignal;
          delete updatedSensor.id;
          updatedSensor = await sensor.updateAttributes(updatedSensor);
        } else if (lastSignal > updatedSensor.lastSync + 30 * 1000) {
          updatedSensor.lastSync = lastSignal;
          delete updatedSensor.id;
          updatedSensor = await sensor.updateAttributes(updatedSensor);
        } else if (!updatedSensor.lastSync) {
          updatedSensor.lastSync = lastSignal;
        }
        await SensorResource.set(resourceKey, JSON.stringify(updatedSensor));
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
   * @returns {object} sensor
   * @returns {function} app.publish
   */
  Sensor.getInstance = async (pattern, sensor) => {
    try {
      const resourceKey = `deviceId-${sensor.deviceId}-sensorId-${sensor.id}`;
      const cachedSensor = await Sensor.app.models.SensorResource.get(resourceKey);
      let instance = JSON.parse(cachedSensor);
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

  // const findInCache = async deviceId => {
  //   try {
  //     const SensorResource = Sensor.app.models.SensorResource;
  //     const sensorsKeys = await SensorResource.keys({
  //       match: `deviceId-${deviceId}-sensorId-*`,
  //     });
  //     const promises = await sensorsKeys.map(async key =>
  //       JSON.parse(await SensorResource.get(key)),
  //     );
  //     const sensors = await Promise.all(promises);
  //     return sensors;
  //   } catch (err) {
  //     throw err;
  //   }
  // };

  Sensor.syncCache = async device => {
    try {
      const sensors = await device.sensors.find();
      // sync redis with mongo
      if (sensors && sensors !== null) {
        sensors.forEach(async sensor => {
          const cacheKey = `deviceId-${device.id}-sensorId-${sensor.id}`;
          const cachedSensor = JSON.parse(await Sensor.app.models.SensorResource.get(cacheKey));
          if (cachedSensor && cachedSensor !== null) {
            delete cachedSensor.id;
            //  console.log('sensor sync 3', cachedSensor.id, sensor.id);
            return sensor.updateAttributes(cachedSensor);
          }
          return null;
        });
      }
      return null;
    } catch (error) {
      return error;
    }
  };
};
