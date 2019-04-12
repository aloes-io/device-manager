/* eslint-disable no-param-reassign */
import iotAgent from 'iot-agent';
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

  Sensor.validate('type', typeValidator, {
    message: 'Wrong sensor type',
  });

  Sensor.validate('transportProtocol', transportProtocolValidator, {
    message: 'Wrong transport protocol name',
  });

  Sensor.validate('messageProtocol', messageProtocolValidator, {
    message: 'Wrong application protocol name',
  });

  Sensor.observe('after save', async ctx => {
    try {
      logger.publish(5, `${collectionName}`, 'afterSave:req', ctx.instance.id);
      if (ctx.instance.id && ctx.instance.ownerId && Sensor.app.broker) {
        let result;
        if (ctx.isNewInstance) {
          result = await iotAgent.publish({
            userId: ctx.instance.ownerId,
            collectionName,
            data: ctx.instance,
            method: 'POST',
            pattern: 'aloesClient',
          });
        } else {
          result = await iotAgent.publish({
            userId: ctx.instance.ownerId,
            collectionName,
            data: ctx.instance,
            //  modelId: ctx.instance.id,
            method: 'PUT',
            pattern: 'aloesClient',
          });
        }
        if (result && result.topic && result.payload) {
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

  Sensor.observe('before delete', async ctx => {
    //  console.log('before delete ', ctx);
    try {
      const instance = await ctx.Model.findById(ctx.where.id);
      //  console.log('before delete ', instance);
      await Sensor.app.models.Measurement.destroyAll({
        sensorId: {like: new RegExp(`.*${ctx.where.id}.*`, 'i')},
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
};
