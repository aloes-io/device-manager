/* eslint-disable no-param-reassign */
import iotAgent from 'iot-agent';
import { updateAloesSensors } from 'aloes-handlers';
import logger from '../services/logger';

/**
 * @module Sensor
 */
module.exports = function(Sensor) {
  const collectionName = 'Sensor';

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
   * Event reporting that a sensor instance has been created or updated.
   * @event after save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Sensor instance
   */
  Sensor.observe('after save', async ctx => {
    try {
      logger.publish(5, `${collectionName}`, 'afterSave:req', ctx.instance.id);
      if (ctx.instance.id && ctx.instance.ownerId && Sensor.app.broker) {
        let result;
        if (ctx.isNewInstance) {
          result = await iotAgent.publish({
            userId: ctx.instance.ownerId,
            collectionName,
            modelId: ctx.instance.id,
            data: ctx.instance,
            method: ctx.instance.method || 'POST',
            pattern: 'aloesClient',
          });
        } else {
          result = await iotAgent.publish({
            userId: ctx.instance.ownerId,
            collectionName,
            data: ctx.instance,
            modelId: ctx.instance.id,
            method: ctx.instance.method || 'PUT',
            pattern: 'aloesClient',
          });
        }
        if (result && result.topic && result.payload) {
          //  return Sensor.app.emit('publish', result.topic, result.payload, false, 0);
          return Sensor.app.publish(result.topic, result.payload);
        }
        throw new Error('Invalid MQTT Packet encoding');
      }
      //  return null;
      throw new Error('Invalid Sensor instance');
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
      const instance = await ctx.Model.findById(ctx.where.id);
      //  console.log('before delete ', instance);
      await Sensor.app.models.Measurement.destroyAll({
        sensorId: { like: new RegExp(`.*${ctx.where.id}.*`, 'i') },
      });
      const result = await iotAgent.publish({
        userId: instance.ownerId,
        collectionName,
        data: instance,
        method: 'DELETE',
        pattern: 'aloesClient',
      });
      if (result && result.topic && result.payload) {
        return Sensor.app.publish(result.topic, result.payload);
      }
      throw new Error('Invalid MQTT Packet encoding');
      //  return null;
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
  Sensor.compose = (device, encoded) => {
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
        logger.publish(4, `${collectionName}`, 'compose:new', {
          sensor,
        });
        return sensor;
      } else if (device.sensors()[0] && device.sensors()[0].id) {
        sensor = device.sensors()[0];
        logger.publish(4, `${collectionName}`, 'compose:update', {
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
        logger.publish(4, `${collectionName}`, 'createOrUpdate:res', {
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
   * When GET method detected, find and publish instance
   * @method module:Sensor.getInstance
   * @param {object} pattern - IotAgent detected pattern
   * @param {object} sensor - Incoming sensor instance
   * @returns {object} sensor
   * @returns {function} app.publish
   */
  Sensor.getInstance = async (pattern, sensor) => {
    try {
      const data = await Sensor.findById(sensor.id);
      let packet = await iotAgent.publish({
        userId: data.ownerId,
        collectionName: 'Sensor',
        data,
        modelId: data.id,
        method: 'GET',
        pattern: 'aloesClient',
      });

      if (pattern.name.toLowerCase() !== 'aloesclient') {
        packet = await iotAgent.decode(packet, pattern.params);
      }
      if (packet.payload && packet.payload !== null) {
        //  console.log('getInstance res:', topic, payload);
        return Sensor.app.publish(packet.topic, packet.payload, false, 0);
      }
      throw new Error('no packet payload to publish');
    } catch (error) {
      return error;
    }
  };
};
