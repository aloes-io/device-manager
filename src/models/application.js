import { updateAloesSensors } from 'aloes-handlers';
import logger from '../services/logger';

/**
 * @module Application
 */

module.exports = Application => {
  const collectionName = 'Application';
  Application.validatesUniquenessOf('appEui');

  /**
   * Event reporting that an application instance has been created or updated.
   * @event after save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Application instance
   */
  Application.observe('after save', async ctx => {
    logger.publish(3, `${collectionName}`, 'afterSave:req', ctx.instance);
    try {
      if (ctx.instance && Application.app) {
        if (ctx.isNewInstance) {
          //  const token = await Application.app.models.accessToken.findOrCreate(
          const token = await ctx.instance.accessTokens.create({
            appEui: ctx.instance.appEui,
            userId: ctx.instance.id,
            ttl: -1,
          });
          logger.publish(2, collectionName, 'afterSave:res1', token);
          await ctx.instance.updateAttribute('apiKey', token.id.toString());
        }
        const token = await Application.app.models.accessToken.findById(ctx.instance.apiKey);
        token.updateAttribute('appEui', ctx.instance.appEui);
        return null;
      }
      return ctx;
    } catch (error) {
      logger.publish(3, `${collectionName}`, 'afterSave:err', error);
      throw error;
    }
  });

  Application.observe('before delete', async ctx => {
    //  console.log('before delete ', ctx);
    try {
      const instance = await ctx.Model.findById(ctx.where.id);
      await Application.app.models.accessToken.destroyById(instance.apiKey);
      return null;
    } catch (error) {
      return error;
    }
  });

  Application.refreshToken = async applicationId => {
    try {
      logger.publish(4, `${collectionName}`, 'refreshToken:req', applicationId);
      const application = await Application.findById(applicationId);
      if (application && application !== null) {
        await Application.app.models.accessToken.destroyById(application.apiKey);
        const token = await application.accessTokens.create({
          appEui: application.appEui,
          //  userId: applicationId,
          ttl: -1,
        });
        return token;
      }
      throw new Error('No application found');
    } catch (error) {
      logger.publish(4, `${collectionName}`, 'refreshToken:err', error);
      return error;
    }
  };

  /**
   * Find device related to incoming MQTT packet
   * @param {object} pattern - IotAgent detected pattern
   * @param {object} message - Parsed external app message
   * @returns {object} device
   */
  const findDeviceByPattern = async (pattern, message) => {
    try {
      let filter = {};
      const params = pattern.params;
      if (message.node) {
        const device = message.node;
        console.log('findDeviceByPattern:req', { device });
        filter = {
          where: {
            and: [
              {
                transportProtocol: {
                  like: new RegExp(`.*${params.transportProtocol}.*`, 'i'),
                },
              },
              { appEui: { like: new RegExp(`.*${params.appEui}.*`, 'i') } },
            ],
          },
        };
        if (device.id && device.id !== null) {
          filter.where.and.push({ id: device.id });
        }
        if (device.devEui && device.devEui !== null) {
          filter.where.and.push({
            devEui: { like: new RegExp(`.*${device.devEui}.*`, 'i') },
          });
        }
        if (device.devAddr && device.devAddr !== null) {
          filter.where.and.push({
            devAddr: { like: new RegExp(`.*${device.devAddr}.*`, 'i') },
          });
        }
      } else if (message.sensor) {
        const sensor = message.sensor;
        // find parent device
        if (!sensor.type || !sensor.deviceId) {
          throw new Error('Invalid sensor');
        }
        filter = {
          where: {
            and: [
              {
                transportProtocol: {
                  like: new RegExp(`.*${params.transportProtocol}.*`, 'i'),
                },
              },
              { appEui: { like: new RegExp(`.*${params.appEui}.*`, 'i') } },
            ],
          },
          include: {
            relation: 'sensors',
            scope: {
              where: {
                and: [
                  {
                    nativeSensorId: sensor.nativeSensorId.toString(),
                  },
                  { type: sensor.type },
                ],
              },
              limit: 1,
            },
          },
        };
        if (sensor.deviceId && sensor.deviceId !== null) {
          filter.where.and.push({ id: sensor.deviceId });
        }
        if (sensor.devEui && sensor.devEui !== null) {
          filter.where.and.push({
            devEui: { like: new RegExp(`.*${sensor.devEui}.*`, 'i') },
          });
        }
        if (sensor.devAddr && sensor.devAddr !== null) {
          filter.where.and.push({
            devAddr: { like: new RegExp(`.*${sensor.devAddr}.*`, 'i') },
          });
        }
      }
      if (!filter || filter === null) throw new Error('Filter empty');
      const foundDevice = await Application.app.models.Device.findOne(filter);
      //  console.log('findDevice:res', {device: foundDevice});
      if (!foundDevice || foundDevice === null) {
        throw new Error('Device not found');
      }
      return foundDevice;
    } catch (error) {
      return error;
    }
  };

  /**
   * When device found, execute payload method
   * @param {object} pattern - IotAgent detected pattern
   * @param {object} message - IotAgent parsed message
   * @param {object} device - found device instance
   * @returns {functions} Application.app.publish
   * @returns {functions} Device.updateAttributes
   */
  const executeDeviceCommand = async (pattern, message, device) => {
    try {
      const params = pattern.params;
      if (params.method === 'GET') {
        message.node = {
          ...message.node,
          id: device.id,
          ownerId: device.ownerId,
        };
        const topic = `${params.appEui}/IoTAgent/GET`;
        return Application.app.publish(topic, message);
      } else if (params.method === 'POST' || params.method === 'PUT') {
        await device.updateAttributes({
          frameCounter: message.node.frameCounter + 1,
          lastSignal: message.node.lastSignal,
          status: true,
        });
      } else if (params.method === 'HEAD') {
        // publish to lorawan server
        //  +appEui/+collectionName/+method/+gatewayId
        message.node.id = device.id;
        message.node.messageProtocol = device.messageProtocol;
        if (device.appSKey) message.node.appSKey = device.appSKey;
        if (device.nwkSKey) message.node.nwkSKey = device.nwkSKey;
        if (device.appKey) message.node.appKey = device.appKey;
        console.log('HEAD 1 ', message.node);
        //  const topic = mqttPattern.fill(pattern.value, pattern.params );
        const topic = `${params.appEui}/IoTAgent/HEAD`;
        return Application.app.publish(topic, message);
      }
      throw new Error('Invalid method');
    } catch (error) {
      return error;
    }
  };

  /**
   * When sensor found, execute payload method
   * @param {object} pattern - IotAgent detected pattern
   * @param {object} message - Parsed external app message
   * @param {object} device - found device instance
   * @returns {functions} Application.app.publish
   * @returns {functions} Sensor.updateAttributes
   */
  const executeSensorCommand = async (pattern, message, device) => {
    try {
      const params = pattern.params;
      let tempSensor = {};
      const sensor = message.sensor;
      if ((!device.sensors()[0] || device.sensors()[0] === null) && sensor.type) {
        //  return null;
        tempSensor = await device.sensors.create({
          ...sensor,
          transportProtocol: device.transportProtocol,
          transportProtocolVersion: device.transportProtocolVersion,
          messageProtocol: device.messageProtocol,
          messageProtocolVersion: device.messageProtocolVersion,
          ownerId: device.ownerId,
        });
      } else if (device.sensors()[0] && device.sensors()[0].id) {
        tempSensor = device.sensors()[0];
        tempSensor.name = sensor.name;
        tempSensor.description = message.description;
        tempSensor.transportProtocol = device.transportProtocol;
        tempSensor.transportProtocolVersion = device.transportProtocolVersion;
        tempSensor.messageProtocol = device.messageProtocol;
        tempSensor.messageProtocolVersion = device.messageProtocolVersion;
      } else {
        throw new Error('No sensor found and no known type to register a new one');
      }

      console.log(' tempSensor:', tempSensor);
      if (params.method === 'GET') {
        message.sensor = {
          ...sensor,
          id: tempSensor.id,
          ownerId: tempSensor.ownerId,
        };
        const topic = `${params.appEui}/IoTAgent/GET`;
        return Application.app.publish(topic, message);
      } else if (params.method === 'POST' || params.method === 'PUT') {
        if (sensor.value && sensor.resource) {
          tempSensor = await updateAloesSensors(tempSensor, Number(sensor.resource), sensor.value);
          tempSensor.frameCounter += 1;
        }
        console.log(' sensor value:', tempSensor.value);
        return tempSensor.updateAttributes(tempSensor);
      }
      throw new Error('Invalid method');
    } catch (error) {
      return error;
    }
  };

  /**
   * Find properties and dispatch to the right function
   * @param {object} packet - MQTT bridge packet
   * @param {object} pattern - Pattern detected by Iot-Agent
   * @returns {functions} executeDeviceCommand
   * @returns {functions} executeSensorCommand
   */
  const parseApplicationMessage = async (packet, pattern) => {
    try {
      logger.publish(4, `${collectionName}`, 'parseApplicationMessage:req', packet.topic);
      if (!pattern.params.method) {
        // todo find equivalent property to assign param.method
        pattern.params.method = 'POST';
      }
      const message = JSON.parse(packet.payload);
      //  console.log('message', message);
      // check message properties, using some payload validators ?
      //  if (!message.gateway) return new Error('missing property');
      if (message.node) {
        const device = await findDeviceByPattern(pattern, message);
        return executeDeviceCommand(pattern, message, device);
      }
      if (message.sensor) {
        const device = await findDeviceByPattern(pattern, message);
        return executeSensorCommand(pattern, message, device);
      }
      throw new Error('Invalid inputs');
    } catch (error) {
      return error;
    }
  };

  /**
   * Dispatch incoming MQTT packet
   * @method module:Application.onPublish
   * @param {object} packet - MQTT bridge packet
   * @param {object} pattern - Pattern detected by Iot-Agent
   * @returns {functions} parseApplicationMessage
   */
  Application.onPublish = async (pattern, packet) => {
    try {
      logger.publish(4, `${collectionName}`, 'onPublish:req', pattern);
      if (!pattern.name || !pattern.params) throw new Error('Invalid inputs');
      switch (pattern.name) {
        case 'loraWan':
          pattern.params.transportProtocol = 'loraWan';
          return parseApplicationMessage(packet, pattern);
        default:
          return parseApplicationMessage(packet, pattern);
      }
    } catch (error) {
      if (!error) {
        throw new Error('Invalid inputs');
      }
      logger.publish(4, `${collectionName}`, 'onPublish:err', error);
      return error;
    }
  };
};
