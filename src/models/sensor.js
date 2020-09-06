/* Copyright 2020 Edouard Maleix, read LICENSE */

import { updateAloesSensors } from 'aloes-handlers';
import iotAgent from 'iot-agent';
import isAlphanumeric from 'validator/lib/isAlphanumeric';
import isLength from 'validator/lib/isLength';
import { publishToDeviceApplications } from '../lib/models/device';
import {
  collectionName,
  compose,
  getResources,
  onBeforeDelete,
  onAfterSave,
  onBeforeSave,
  onBeforeRemote,
  persistingResource,
  messageProtocolValidator,
  resourceValidator,
  transportProtocolValidator,
  typeValidator,
  validateOmaObject,
} from '../lib/models/sensor';
import logger from '../services/logger';
import utils from '../lib/utils';

/**
 * @module Sensor
 * @property {string} id  Database generated ID.
 * @property {string} name required.
 * @property {string} devEui hardware generated Device Id required.
 * @property {date} createdAt
 * @property {date} lastSignal
 * @property {number} frameCounter Number of messages since last connection
 * @property {string} type OMA object ID, used to format resources schema
 * @property {string} resource OMA resource ID used for last message
 * @property {array} resources OMA Resources ( formatted object where sensor value and settings are stored )
 * @property {array} icons OMA Object icons URL
 * @property {bject} colors OMA Resource colors
 * @property {string} transportProtocol Framework used for message transportation
 * @property {string} transportProtocolVersion Framework version
 * @property {string} messageProtocol Framework used for message encoding
 * @property {string} messageProtocolVersion Framework version
 * @property {string} nativeSensorId Original sensor id ( stringified integer )
 * @property {string} [nativeNodeId] Original node id ( stringified integer )
 * @property {string} nativeType Original sensor type identifier
 * @property {string} nativeResource Original sensor variables identifier
 * @property {string} ownerId User ID of the developer who registers the application.
 * @property {string} deviceId Device instance Id which has sent this measurement
 */
module.exports = function (Sensor) {
  Sensor.validatesPresenceOf('deviceId');

  Sensor.validatesPresenceOf('ownerId');

  Sensor.validatesPresenceOf('name');

  Sensor.validatesPresenceOf('icons');

  Sensor.validatesPresenceOf('colors');

  Sensor.validate('type', typeValidator, {
    message: 'Wrong sensor type',
  });

  Sensor.validate('resource', resourceValidator, {
    message: 'Wrong sensor resource',
  });

  Sensor.validate('transportProtocol', transportProtocolValidator, {
    message: 'Wrong transport protocol name',
  });

  Sensor.validate('messageProtocol', messageProtocolValidator, {
    message: 'Wrong application protocol name',
  });

  // Sensor.validatesDateOf('createdAt', { message: 'createdAt is not a date' });

  Sensor.validatesDateOf('lastSignal', { message: 'lastSignal is not a date' });

  /**
   * Format packet and send it via MQTT broker
   * @async
   * @method module:Sensor.publish
   * @param {object} device - found Device instance
   * @param {object} sensor - Sensor instance
   * @param {string} [method] - MQTT API method
   * @param {object} [client] - MQTT client target
   * @fires Server.publish
   * @returns {Promise<object | null>} sensor
   */
  Sensor.publish = async (deviceId, sensor, method, client) => {
    if (!deviceId) {
      throw utils.buildError(400, 'INVALID_DEVICE', 'Invalid device id');
    }
    if (!sensor || !sensor.id || !sensor.ownerId) {
      throw utils.buildError(400, 'INVALID_SENSOR', 'Invalid sensor instance');
    }
    const device = await utils.findById(Sensor.app.models.Device, deviceId);
    if (!device) {
      throw utils.buildError(400, 'INVALID_DEVICE', 'Invalid device instance');
    }
    let publishMethod = method || sensor.method;
    if (sensor.isNewInstance && !publishMethod) {
      publishMethod = 'POST';
    } else if (!publishMethod) {
      publishMethod = 'PUT';
    }
    const packet = iotAgent.publish({
      userId: sensor.ownerId,
      collection: collectionName,
      modelId: sensor.id,
      data: sensor,
      method: publishMethod,
      pattern: 'aloesclient',
    });
    if (packet && packet.topic && packet.payload) {
      logger.publish(4, `${collectionName}`, 'publish:res', {
        topic: packet.topic,
      });
      // if (client && client.id) {
      //   // publish to client
      //   return null;
      // }
      // if (client && (client.ownerId || client.appId)) {
      if (client && client.ownerId) {
        const pattern = iotAgent.patternDetector(packet);
        let nativePacket = { topic: packet.topic, payload: JSON.stringify(sensor) };
        nativePacket = iotAgent.decode(nativePacket, pattern.params);
        if (
          nativePacket.payload &&
          nativePacket.payload !== null &&
          nativePacket.topic.search(sensor.inPrefix) !== -1
        ) {
          logger.publish(4, `${collectionName}`, 'publish:res', {
            nativeTopic: nativePacket.topic,
          });
          Sensor.app.emit('publish', nativePacket.topic, nativePacket.payload, false, 0);
        }
      }

      publishToDeviceApplications(Sensor.app, device, packet);
      // console.log('payload', typeof packet.payload);
      Sensor.app.emit('publish', packet.topic, packet.payload, false, 0);
      return sensor;
    }
    throw new Error('Invalid MQTT Packet encoding');
  };

  /**
   * When device found,validate sensor instance produced by IoTAgent
   * @async
   * @method module:Sensor.compose
   * @param {object} device - found device instance
   * @param {object} attributes - IotAgent parsed message
   * @returns {Promise<object>} sensor
   */
  Sensor.compose = async (device, attributes) => {
    let sensor = {};
    // const schema = Sensor.definition.properties
    // todo improve composition with attributes validation based on schema types using yup ?
    if ((!device.sensors() || !device.sensors()[0]) && attributes.type) {
      sensor = compose(device, attributes);
      return device.sensors.create(sensor);
    }
    if (device.sensors()[0] && device.sensors()[0].id) {
      sensor = compose(device, attributes, false);
      return sensor;
    }
    throw new Error('no sensor found and no known type to register a new one');
  };

  /**
   * When HEAD method detected, update sensor instance ( not the value )
   * @async
   * @method module:Sensor.handlePresentation
   * @param {object} sensor - Incoming sensor instance
   * @param {object} [client] - MQTT client
   * @returns {Promise<function>} Sensor.publish
   */
  Sensor.handlePresentation = async (sensor, client) => {
    logger.publish(4, `${collectionName}`, 'handlePresentation:req', {
      deviceId: sensor.deviceId,
      sensorId: sensor.id,
      sensorName: sensor.name,
    });
    if (sensor.isNewInstance && sensor.icons) {
      sensor.method = 'HEAD';
      await Sensor.replaceById(sensor.id, sensor);
      return Sensor.publish(sensor.deviceId, sensor, 'HEAD', client);
    }
    if (!sensor.isNewInstance && sensor.id) {
      sensor.method = 'HEAD';
      sensor.frameCounter = 0;
      await Sensor.replaceById(sensor.id, sensor);
      return Sensor.publish(sensor.deviceId, sensor, 'HEAD', client);
    }
    throw utils.buildError(400, 'INVALID_SENSOR', 'No valid sensor to register');
  };

  /**
   * When POST or PUT method detected, validate sensor.resource and value, then save sensor instance
   * @method module:Sensor.createOrUpdate
   * @param {object} sensor - Incoming Densor instance
   * @param {number} resourceKey - Sensor resource name ( OMA )
   * @param {object} resourceValue - Sensor resource value to save
   * @param {object} [client] - MQTT client
   * @returns {Promise<object>} sensor
   */
  Sensor.createOrUpdate = async (sensor, resourceKey, resourceValue, client) => {
    logger.publish(4, `${collectionName}`, 'createOrUpdate:req', {
      sensorId: sensor.id,
      resourceKey,
      name: sensor.name,
    });

    if (resourceValue === undefined || resourceKey === undefined || resourceKey === null) {
      throw utils.buildError(400, 'INVALID_ARGS', 'Missing Sensor key/value to update');
    }
    if (sensor.isNewInstance || !sensor || !sensor.id) {
      throw utils.buildError(400, 'INVALID_SENSOR', 'Sensor not validated yet');
    }

    const foundSensor = await utils.findById(Sensor, sensor.id);
    const resources = await getResources(foundSensor);
    sensor.resources = sensor.resources ? { ...resources, ...sensor.resources } : resources;
    const updatedSensor = updateAloesSensors(sensor, Number(resourceKey), resourceValue);
    if (!updatedSensor || !updatedSensor.id) {
      throw utils.buildError(400, 'INVALID_SENSOR_UPDATE', 'Sensor not updated');
    }
    logger.publish(3, `${collectionName}`, 'createOrUpdate:res', {
      inType: typeof resourceValue,
      outType: typeof updatedSensor.resources[updatedSensor.resource],
    });

    // updatedSensor.value = null; free sensor space ?
    updatedSensor.frameCounter += 1;
    updatedSensor.lastSignal = new Date();
    updatedSensor.method = 'PUT';

    await Sensor.replaceById(sensor.id, updatedSensor);
    await Sensor.publish(sensor.deviceId.toString(), updatedSensor, 'PUT', client);
    await persistingResource(Sensor.app, updatedSensor, client);
    return updatedSensor;
  };

  /**
   * When GET method detected, find and publish instance
   * @method module:Sensor.getInstance
   * @param {object} sensor - Incoming sensor instance
   * @param {object} [client] - MQTT client
   * @returns {Promise<object>} sensor
   */
  Sensor.getInstance = async (sensor, client) => {
    logger.publish(4, `${collectionName}`, 'getInstance:req', {
      sensorId: sensor.id,
    });
    const instance = await utils.findById(Sensor, sensor.id);
    if (!instance) {
      throw new Error('Sensor not found');
    }
    // if (pattern.name.toLowerCase() !== 'aloesclient') {
    //   let packet = { payload: JSON.stringify(instance) };
    //   packet = await iotAgent.decode(packet, pattern.params);
    //   if (packet.payload && packet.payload !== null) {
    //     return Sensor.app.publish(packet.topic, packet.payload, false, 1);
    //   }
    //   throw new Error('no packet payload to publish');
    // }
    //  const topic = `${params.appEui}/Sensor/HEAD`;
    await Sensor.publish(sensor.deviceId, instance, 'GET', client);
    return instance;
  };

  /**
   * When sensor found, execute method extracted from MQTT topic
   * @param {object} sensor - Parsed external app message
   * @param {string} method - method from MQTT topic
   * @param {object} [client] - MQTT client
   * @returns {Promise<object>} sensor
   */
  Sensor.execute = async (sensor, method, client) => {
    logger.publish(4, `${collectionName}`, 'execute:req', method);
    // also replace sensor when they share same nativeSensorId and nativeNodeId but type has changed ?
    switch (method.toUpperCase()) {
      case 'HEAD':
        await Sensor.handlePresentation(sensor, client);
        break;
      case 'GET':
        await Sensor.getInstance(sensor, client);
        break;
      case 'POST':
        await Sensor.createOrUpdate(sensor, sensor.resource, sensor.value, client);
        break;
      case 'PUT':
        await Sensor.createOrUpdate(sensor, sensor.resource, sensor.value, client);
        break;
      // case 'STREAM':
      //     await Sensor.publish(device.id, sensor, 'STREAM', client);
      //   break;
      case 'DELETE':
        await Sensor.deleteById(sensor.id);
        break;
      // case 'ERROR':
      //   break;
      default:
        throw new Error('Unsupported method');
    }
    return sensor;
  };

  /**
   * Dispatch incoming MQTT packet
   * @method module:Sensor.onPublish
   * @param {object} device - Found Device instance
   * @param {object} attributes - Sensor attributes detected by Iot-Agent
   * @param {object} [sensor] - Found Sensor instance
   * @param {object} client - MQTT client
   * @returns {Promise<function>} Sensor.execute
   */
  Sensor.onPublish = async (device, attributes, sensor, client) => {
    logger.publish(4, `${collectionName}`, 'onPublish:req', {
      sensor: sensor && sensor.id,
      attributes: attributes && attributes.devEui,
    });

    if (!sensor) {
      sensor = await Sensor.compose(device, attributes);
    }
    if (sensor && sensor.id) {
      let method = sensor.method;
      if (!method) {
        method = sensor.isNewInstance ? 'HEAD' : 'PUT';
      }
      return Sensor.execute(sensor, method, client);
    }
    throw utils.buildError(400, 'INVALID_SENSOR', 'Error while building sensor instance');
  };

  /**
   * Search sensor by keywords ( name, type, )
   * @method module:Sensor.search
   * @param {object} filter - Requested filter
   * @returns {Promise<array>} sensors
   */
  Sensor.search = async (filter) => {
    logger.publish(4, `${collectionName}`, 'search:req', filter);
    if (
      !filter.text ||
      !isLength(filter.text, { min: 2, max: 30 }) ||
      !isAlphanumeric(filter.text)
    ) {
      throw utils.buildError(400, 'INVALID_INPUT', 'Invalid search content');
    }
    /* eslint-disable security/detect-non-literal-regexp */
    // use OMA object description as lexic
    const omaObjectsList = await utils.find(Sensor.app.models.OmaObject, {
      where: {
        or: [
          { name: { like: new RegExp(`.*${filter.text}.*`, 'i') } },
          { id: { like: new RegExp(`.*${filter.text}.*`, 'i') } },
          { description: { like: new RegExp(`.*${filter.text}.*`, 'i') } },
        ],
      },
    });

    const result = await Promise.all(
      omaObjectsList.map(async (obj) => {
        try {
          const whereFilter = {
            or: [
              { and: [{ name: { like: new RegExp(`.*${obj.name}.*`, 'i') } }, { type: obj.id }] },
              { transportProtocol: { like: new RegExp(`.*${filter.text}.*`, 'i') } },
            ],
          };
          const sensors = await utils.find(Sensor, {
            where: whereFilter,
          });
          return !sensors || sensors === null ? [] : [...JSON.parse(JSON.stringify(sensors))];
        } catch (e) {
          return [];
        }
      }),
    );
    /* eslint-enable security/detect-non-literal-regexp */

    if (!result || result === null) {
      return [];
    }
    const sensors = utils.flatten(result);
    if (filter.limit && typeof filter.limit === 'number' && sensors.length > filter.limit) {
      sensors.splice(filter.limit, sensors.length - 1);
    }
    logger.publish(3, `${collectionName}`, 'search:res', sensors.length);
    return sensors;
  };

  /**
   * Export sensors list from JSON to {format}
   * @method module:Sensor.export
   * @param {array} sensors
   * @param {string} [format]
   * @returns {Promise<string | null>}
   */
  Sensor.export = async (sensors, filter, format = 'csv') => {
    if (!sensors || sensors.length < 1) return null;
    const filteredProperties = ['measurements', 'icons', 'resources', 'colors'];
    if (format === 'csv') {
      sensors.forEach((sensor) => {
        // eslint-disable-next-line security/detect-object-injection
        filteredProperties.forEach((p) => delete sensor[p]);
      });
      return utils.exportToCSV(sensors, filter);
    }
    return null;
  };

  /**
   * Event reporting that a device client sent sensors update.
   * @event publish
   * @param {object} message - Parsed MQTT message.
   * @property {object} message.device - found device instance.
   * @property {object} message.pattern - Pattern detected by Iot-Agent
   * @property {object} message.attributes - IotAgent parsed message
   * @property {object} [message.sensor] - Found sensor instance
   * @property {object} message.client - MQTT client
   * @returns {Promise<function | null>} Sensor.onPublish
   */
  Sensor.on('publish', (message) => {
    try {
      // if (!message || message === null) throw new Error('Message empty');
      const { attributes, client, device, sensor } = message;
      //  const pattern = message.pattern;
      if (!device || (!attributes && !sensor)) {
        throw new Error('Message missing properties');
      }
      return Sensor.onPublish(device, attributes, sensor, client);
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'on-publish:err', error);
      return null;
    }
  });

  Sensor.once('started', () => {
    const { Measurement, SensorResource } = Sensor.app.models;

    /* eslint-disable camelcase */
    /* eslint-disable no-underscore-dangle */

    /**
     * Get sensor resources from key/value store
     * @method module:Sensor.prototype.__get__resources
     * @returns {Promise<object>}
     */
    Sensor.prototype.__get__resources = async function () {
      const resources = await SensorResource.find(this.deviceId, this.id);
      validateOmaObject(this, resources);
      return resources;
    };

    /**
     * Get sensor resources from key/value store by key
     * @method module:Sensor.prototype.__findById__resources
     * @param {string} id Resource key
     * @returns {Promise<object>}
     */
    Sensor.prototype.__findById__resources = function (id) {
      return SensorResource.find(this.deviceId, this.id, id);
    };

    /**
     * Create sensor resources in key/value store
     * @method module:Sensor.prototype.__create__resources
     * @param {object} resources Resources key/value object
     * @returns {Promise<object>}
     */
    Sensor.prototype.__create__resources = function (resources) {
      validateOmaObject(this, resources);
      return SensorResource.save(this.deviceId, this.id, resources);
    };

    /**
     * Replace sensor resources in key/value store
     * @method module:Sensor.prototype.__replace__resources
     * @param {object} resources Resources key/value object
     * @returns {Promise<object>}
     */
    Sensor.prototype.__replace__resources = function (resources) {
      validateOmaObject(this, resources);
      return SensorResource.save(this.deviceId, this.id, resources);
    };

    // Sensor.prototype.__replaceById__resources = async function(resource) {
    //   return SensorResource.save(this.deviceId, this.id, resource);
    // };

    /**
     * Delete sensor resources from key/value store
     * @method module:Sensor.prototype.__delete__resources
     * @returns {Promise<string[]>}
     */
    Sensor.prototype.__delete__resources = function () {
      return SensorResource.remove(this.deviceId, this.id);
    };

    // Sensor.prototype.__destroyById__resources = async function(id) {
    //   return SensorResource.remove(this.deviceId, this.id, id);
    // };

    /**
     * Get sensor measurement from timeseries store
     * @method module:Sensor.prototype.__get__measurements
     * @param {object} filter Measurement filter
     * @returns {Promise<object[]>}
     */
    Sensor.prototype.__get__measurements = async function (filter) {
      if (!filter) filter = { where: {} };
      const points = await Measurement.find({
        where: {
          ...filter.where,
          sensorId: this.id.toString(),
          // deviceId: this.deviceId.toString(),
          ownerId: this.ownerId.toString(),
          // OR: [{ rp: '0s' }, { rp: '2h' }],
          // rp: '0s',
        },
        limit: filter.limit || 100,
      });
      return points || [];
    };

    /**
     * Get sensor measurement from timeseries store by id
     * @method module:Sensor.prototype.__findById__measurements
     * @param {string} id Resource key
     * @returns {Promise<object>}
     */

    /**
     * Create sensor measurement in timeseries store
     * @method module:Sensor.prototype.__create__measurements
     * @param {object} measurement
     * @returns {Promise<object>}
     */
    Sensor.prototype.__create__measurements = async function (measurement) {
      const point = await Measurement.create({
        ...measurement,
        sensorId: this.id.toString(),
        deviceId: this.deviceId.toString(),
        ownerId: this.ownerId.toString(),
        nativeSensorId: this.nativeSensorId,
        nativeNodeId: this.nativeNodeId,
      });
      return point && point.id;
    };

    /**
     * Replace sensor measurement in timeseries store
     * @method module:Sensor.prototype.__replace__measurements
     * @param {object} attributes
     * @param {object} filter
     * @returns {Promise<object[] | null>}
     */
    Sensor.prototype.__replace__measurements = async function (attributes, filter) {
      if (!filter) filter = { where: {} };
      try {
        return await Measurement.replace(
          {
            where: {
              ...filter.where,
              sensorId: this.id.toString(),
              // deviceId: this.deviceId.toString(),
              // ownerId: this.ownerId.toString(),
            },
          },
          attributes,
        );
      } catch (error) {
        return null;
      }
    };

    /**
     * Delete sensor measurement from timeseries store
     * @method module:Sensor.prototype.__delete__measurements
     * @param {object} filter
     * @returns {Promise<boolean>}
     */
    Sensor.prototype.__delete__measurements = async function (filter) {
      if (!filter) filter = {};
      const result = await Measurement.delete({
        ...filter,
        sensorId: this.id.toString(),
        // deviceId: this.deviceId.toString(),
        // ownerId: this.ownerId.toString(),
      });
      return result;
    };

    /* eslint-enable camelcase */
    /* eslint-enable no-underscore-dangle */
  });

  /**
   * Event reporting that a sensor instance will be created or updated.
   * @event before_save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Sensor instance
   * @returns {Promise<function>} Sensor~onBeforeSave
   */
  Sensor.observe('before save', onBeforeSave);

  /**
   * Event reporting that a sensor instance has been created or updated.
   * @event after_save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Sensor instance
   * @returns {Promise<function>} Sensor~onAfterSave
   */
  Sensor.observe('after save', onAfterSave);

  /**
   * Event reporting that a/several sensor instance(s) will be deleted.
   * @event before_delete
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.where.id - Sensor id
   * @returns {Promise<function>} Sensor~onBeforeDelete
   */
  Sensor.observe('before delete', onBeforeDelete);

  /**
   * Event reporting that a sensor method is requested
   * @event before_*
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @returns {Promise<function>} Sensor~onBeforeRemote
   */
  Sensor.beforeRemote('**', async (ctx) => onBeforeRemote(Sensor.app, ctx));

  Sensor.afterRemoteError('*', (ctx, next) => {
    logger.publish(2, `${collectionName}`, `after ${ctx.methodString}:err`, ctx.error);
    next();
  });

  /**
   * Find sensors
   * @async
   * @method module:Sensor.find
   * @param {object} filter
   * @returns {Promise<object>}
   */

  /**
   * Returns sensors length
   * @async
   * @method module:Sensor.count
   * @param {object} where
   * @returns {Promise<object>}
   */

  /**
   * Find sensor by id
   * @async
   * @method module:Sensor.findById
   * @param {any} id
   * @param {object} filter
   * @returns {Promise<object>}
   */

  /**
   * Create sensor
   * @async
   * @method module:Sensor.create
   * @param {object} sensor
   * @returns {Promise<object>}
   */

  /**
   * Update sensor by id
   * @async
   * @method module:Sensor.updateById
   * @param {any} id
   * @param {object} filter
   * @returns {Promise<object>}
   */

  /**
   * Delete sensor by id
   * @async
   * @method module:Sensor.deleteById
   * @param {any} id
   * @param {object} filter
   * @returns {Promise<object>}
   */

  Sensor.disableRemoteMethodByName('upsertWithWhere');
  Sensor.disableRemoteMethodByName('replaceOrCreate');
  Sensor.disableRemoteMethodByName('createChangeStream');

  Sensor.disableRemoteMethodByName('prototype.__count__measurements');
  Sensor.disableRemoteMethodByName('prototype.__updateById__measurements');
  Sensor.disableRemoteMethodByName('prototype.__deleteById__measurements');
  Sensor.disableRemoteMethodByName('prototype.__link__measurements');
  Sensor.disableRemoteMethodByName('prototype.__unlink__measurements');
};
