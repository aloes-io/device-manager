/* Copyright 2019 Edouard Maleix, read LICENSE */

import { updateAloesSensors } from 'aloes-handlers';
import iotAgent from 'iot-agent';
import { omaObjects, omaResources } from 'oma-json';
import isAlphanumeric from 'validator/lib/isAlphanumeric';
import isLength from 'validator/lib/isLength';
import logger from '../services/logger';
import utils from '../services/utils';
import protocols from '../initial-data/protocols.json';

const collectionName = 'Sensor';
const filteredProperties = ['children', 'size', 'show', 'group', 'success', 'error'];

/**
 * Validate instance before creation
 * @method module:Sensor~onBeforeSave
 * @param {object} ctx - Loopback context
 * @returns {object} ctx
 */
const onBeforeSave = async ctx => {
  try {
    if (ctx.options && ctx.options.skipPropertyFilter) return ctx;
    if (ctx.instance) {
      logger.publish(5, `${collectionName}`, 'onBeforeSave:req', '');
      const promises = filteredProperties.map(async p => ctx.instance.unsetAttribute(p));
      await Promise.all(promises);
    } else if (ctx.data) {
      logger.publish(5, `${collectionName}`, 'onBeforePartialSave:req', '');
      // eslint-disable-next-line security/detect-object-injection
      filteredProperties.map(p => delete ctx.data[p]);
      // const promises = filteredProperties.map(p => delete ctx.data[p]);
      // await Promise.all(promises);
      ctx.hookState.updateData = ctx.data;
    }
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onBeforeSave:err', error);
    throw error;
  }
};

/**
 * Define the way to persist data based on OMA resource type
 *
 * Methods = "measurement" || "buffer" || "log" || "scheduler" || "location"
 *
 * @method module:Sensor~getPersistingMethod
 * @param {string} sensorType - OMA object Id
 * @param {number} resource - OMA resource ID
 * @param {string} type - OMA resource type
 * @returns {string} method
 */
const getPersistingMethod = (sensorType, resource, type) => {
  logger.publish(5, `${collectionName}`, 'getPersistingMethod:req', {
    type,
  });
  let saveMethod;
  if (!sensorType || !resource) return null;
  if (!type || type === null) {
    switch (resource) {
      case 5505:
        // Reset the counter value
        saveMethod = 'log';
        break;
      case 5523:
        // Trigger initing actuation
        if (sensorType === 3339) {
          saveMethod = 'log';
        } else {
          saveMethod = 'scheduler';
        }
        break;
      case 5530:
        // Command to clear display
        saveMethod = 'log';
        break;
      case 5650:
        // Reset min and max current values
        saveMethod = 'log';
        break;
      case 5822:
        // Reset cumulative energy
        saveMethod = 'log';
        break;
      case 5911:
        // Reset bitmap input value
        saveMethod = 'log';
        break;
      default:
        saveMethod = null;
    }
  } else {
    switch (type.toLowerCase()) {
      case 'string':
        switch (resource) {
          case 5514:
            // latitude
            saveMethod = 'location';
            break;
          case 5515:
            // longitude
            saveMethod = 'location';
            break;
          default:
            saveMethod = 'log';
        }
        break;
      case 'integer':
        switch (resource) {
          case 5526:
            // scheduler mode
            saveMethod = 'scheduler';
            break;
          case 5534:
            // scheduler output transitions counter
            saveMethod = 'scheduler';
            break;
          case 5910:
            // bitmap input
            saveMethod = 'buffer';
            break;
          default:
            saveMethod = 'measurement';
        }
        break;
      case 'float':
        switch (resource) {
          case 5521:
            // duration of the time delay
            saveMethod = 'scheduler';
            break;
          case 5524:
            // sound duration
            saveMethod = 'scheduler';
            break;
          case 5525:
            // minimum off time
            saveMethod = 'scheduler';
            break;
          case 5538:
            // remaining time
            saveMethod = 'scheduler';
            break;
          case 5544:
            // cumulative time that timer input is true
            saveMethod = 'scheduler';
            break;
          case 5824:
            // Time when the load control event will start started.
            saveMethod = 'scheduler';
            break;
          case 5825:
            // The duration of the load control event.
            saveMethod = 'scheduler';
            break;
          default:
            saveMethod = 'measurement';
        }
        break;
      case 'boolean':
        switch (resource) {
          case 5532:
            // increase input state
            saveMethod = 'log';
            break;
          case 5533:
            // decrease input state
            saveMethod = 'log';
            break;
          case 5543:
            // timer output state
            saveMethod = 'scheduler';
            break;
          case 5850:
            // switch state
            if (sensorType === 3340) {
              saveMethod = 'scheduler';
            } else {
              saveMethod = 'measurement';
            }
            break;
          default:
            saveMethod = 'measurement';
        }
        break;
      case 'time':
        saveMethod = 'log';
        break;
      case 'opaque':
        if (resource === 5917) {
          saveMethod = 'measurement';
        } else if (resource === 5522) {
          saveMethod = 'buffer';
        }
        break;
      default:
        saveMethod = null;
    }
  }

  logger.publish(4, `${collectionName}`, 'getPersistingMethod:res', {
    method: saveMethod,
  });
  return saveMethod;
};

/**
 * Persist data based on OMA resource type
 *
 * use influxdb for integers and floats
 *
 * use filestorage for strings and buffers
 *
 * @method module:Sensor~persistingResource
 * @param {object} app - Loopback app
 * @param {object} device - Device instance
 * @param {object} sensor - Sensor instance
 * @param {object} [client] - MQTT client
 * @returns {object} result - saved value
 */
const persistingResource = async (app, device, sensor, client) => {
  try {
    logger.publish(5, `${collectionName}`, 'persistingResource:req', {
      resource: sensor.resource,
    });
    const resourceModel = await app.models.OmaResource.findById(sensor.resource);
    if (!resourceModel) throw new Error('OMA Resource does not exist');
    const method = await getPersistingMethod(sensor.type, resourceModel.id, resourceModel.type);
    let result;
    let persistedResource = {};
    if (!method || method === null) return null;
    if (method === 'measurement') {
      const Measurement = app.models.Measurement;
      const measurement = await Measurement.compose(sensor);
      if (measurement && measurement !== null) {
        try {
          const point = await Measurement.create(measurement);
          if (point && point.id) {
            //  console.log('influx measurement : ', point.id);
            // todo fix id generation error
            await Measurement.publish(device, point.id, 'POST');
            persistedResource = point;
          }
        } catch (e) {
          // empty
        }
      }
    } else if (method === 'log') {
      // in the future add to elastic search db ?
      // todo save ( append ) resource in log file ( in device container ) then use utils.liner to access it later
    } else if (method === 'location') {
      // also update device.address with reverse geocoding ?
    } else if (method === 'buffer') {
      const Files = app.models.Files;
      const buffer = await Files.compose(sensor);
      // todo limit buffer size !
      // send error ?
      const fileMeta = await Files.uploadBuffer(
        buffer,
        sensor.ownerId.toString(),
        `${sensor.deviceId.toString()}-${sensor.id.toString()}`,
      );
      persistedResource = fileMeta;
    } else if (method === 'scheduler') {
      const Scheduler = app.models.Scheduler;
      result = await Scheduler.createOrUpdate(device, sensor, client);
      sensor = result.sensor;
      persistedResource = result.scheduler;
    }
    return { persistedResource, sensor };
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'persistingResource:err', error);
    return null;
  }
};

/**
 * Create relations on instance creation
 * @method module:Sensor~onAfterSave
 * @param {object} ctx - Loopback context
 * @returns {object} ctx
 */
const onAfterSave = async ctx => {
  try {
    logger.publish(3, `${collectionName}`, 'onAfterSave:req', ctx.hookState);
    if (ctx.instance.id && ctx.instance.ownerId) {
      await ctx.Model.app.models.SensorResource.setCache(ctx.instance.deviceId, ctx.instance);
    }
    // if (ctx.hookState.updateData) {}
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onAfterSave:err', error);
    throw error;
  }
};

/**
 * Remove sensor dependencies
 * @method module:Sensor~deleteProps
 * @param {object} app - Loopback app
 * @param {object} instance
 * @returns {function} Sensor.publish
 */
const deleteProps = async (app, sensor) => {
  try {
    logger.publish(3, `${collectionName}`, 'deleteProps:req', sensor);
    app.models.Measurement.destroyAll({
      sensorId: sensor.id.toString(),
    }).catch(e => e);

    await app.models.SensorResource.deleteCache(sensor.deviceId, sensor.id);
    const device = await app.models.Device.findById(sensor.deviceId);
    await app.models.Sensor.publish(device, sensor, 'DELETE');
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'deleteProps:err', error);
  }
};

/**
 * Delete relations on instance(s) deletetion
 * @method module:Sensor~onBeforeDelete
 * @param {object} ctx - Loopback context
 * @returns {object} ctx
 */
const onBeforeDelete = async ctx => {
  try {
    logger.publish(3, `${collectionName}`, 'onBeforeDelete:req', ctx.where);
    if (ctx.where && ctx.where.id && !ctx.where.id.inq) {
      const sensor = await ctx.Model.findById(ctx.where.id);
      await deleteProps(ctx.Model.app, sensor);
    } else {
      const filter = { where: ctx.where };
      const sensors = await ctx.Model.find(filter);
      if (sensors && sensors.length > 0) {
        await Promise.all(sensors.map(async sensor => deleteProps(ctx.Model.app, sensor)));
      }
    }
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onBeforeDelete:err', error);
    throw error;
  }
};

const onBeforeRemote = async (app, ctx) => {
  try {
    if (ctx.method.name.indexOf('find') !== -1 || ctx.method.name.indexOf('get') !== -1) {
      // let sensors;
      // let result = [];
      const options = ctx.args ? ctx.args.options : {};
      if (!options || !options.currentUser) {
        throw utils.buildError(401, 'UNAUTHORIZED', 'Requires authentification');
      }
      const isAdmin = options.currentUser.roles.includes('admin');
      const ownerId = utils.getOwnerId(options);
      if (ctx.req.query && ctx.req.query.filter && !isAdmin) {
        if (typeof ctx.req.query.filter === 'string') {
          ctx.req.query.filter = JSON.parse(ctx.req.query.filter);
        }
        if (!ctx.req.query.filter.where) ctx.req.query.filter.where = {};
        ctx.req.query.filter.where.ownerId = ownerId;
        // sensors = await Sensor.find(ctx.req.query.filter);
      }
      // if (ctx.req.params && ctx.req.params.id) {
      //   if (!isAdmin) {
      //     ctx.req.params.ownerId = options.currentUser.id.toString();
      //   }
      //   if (params.ownerId) {
      //     sensors = await Sensor.find({
      //       where: { and: [{ id: ctx.req.params.id }, { ownerId: ctx.req.params.ownerId }] },
      //     });
      //   } else {
      //     sensors = await Sensor.findById(id);
      //   }
      // }
      // // find in mongo and replace by cached ones
      // if (sensors && Array.isArray(sensors)) {
      //   const cachedSensors = await sensors.map(
      //     async sensor => await SensorResource.getCache(sensor.deviceId, sensor.id),
      //   );
      //   result = await Promise.all(cachedSensors);
      // } else if (sensors && typeof sensors === 'object') {
      //   result = await SensorResource.getCache(sensors.deviceId, sensors.id);
      // }

      // if (result && result !== null) {
      //   ctx.result = result;
      // }
    } else if (ctx.method.name === 'search' || ctx.method.name === 'geoLocate') {
      const options = ctx.args ? ctx.args.options : {};
      if (!options || !options.currentUser) {
        throw utils.buildError(401, 'UNAUTHORIZED', 'Requires authentification');
      }
      const isAdmin = options.currentUser.roles.includes('admin');
      if (!isAdmin) {
        if (!ctx.args.filter) ctx.args.filter = {};
        ctx.args.filter.ownerId = options.currentUser.id.toString();
      }
    }
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onBeforeRemote:err', error);
    throw error;
  }
};

/**
 * @module Sensor
 * @property {string} id  Database generated ID.
 * @property {string} name required.
 * @property {string} devEui hardware generated Device Id required.
 * @property {date} lastSignal
 * @property {date} lastSync last date when this sensor cache was synced
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
module.exports = function(Sensor) {
  function typeValidator(err) {
    if (
      !this.type ||
      !isLength(this.type.toString(), { min: 1, max: 4 }) ||
      !omaObjects.some(object => object.value === this.type)
    ) {
      err();
    }
  }

  function resourceValidator(err) {
    // todo : check if this.resource is in omaObjects[this.type].resources
    if (
      this.resource === undefined ||
      !isLength(this.resource.toString(), { min: 1, max: 4 }) ||
      !omaResources.some(resource => resource.value === this.resource)
    ) {
      err();
    }
  }

  function transportProtocolValidator(err) {
    if (
      !this.transportProtocol ||
      !protocols.transport.some(p => p.toLowerCase() === this.transportProtocol.toLowerCase())
    ) {
      err();
    }
  }

  function messageProtocolValidator(err) {
    if (
      !this.messageProtocol ||
      !protocols.message.some(p => p.toLowerCase() === this.messageProtocol.toLowerCase())
    ) {
      err();
    }
  }

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

  Sensor.validatesDateOf('lastSignal', { message: 'lastSignal is not a date' });
  // Sensor.validatesDateOf('createdAt', { message: 'createdAt is not a date' });

  /**
   * Format packet and send it via MQTT broker
   * @method module:Sensor.publish
   * @param {object} device - found Device instance
   * @param {object} sensor - Sensor instance
   * @param {string} [method] - MQTT API method
   * @param {object} [client] - MQTT client target
   * @fires Server.publish
   */
  Sensor.publish = async (device, sensor, method, client) => {
    try {
      if (!device || !device.id) {
        throw utils.buildError(403, 'INVALID_DEVICE', 'Invalid device instance');
      }
      if (!sensor || !sensor.id || !sensor.ownerId) {
        throw utils.buildError(403, 'INVALID_SENSOR', 'Invalid sensor instance');
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

        if (device.appIds && device.appIds.length > 0) {
          const promises = device.appIds.map(async appId => {
            try {
              const parts = packet.topic.split('/');
              parts[0] = appId;
              const topic = parts.join('/');
              Sensor.app.emit('publish', topic, packet.payload, false, 0);
              return topic;
            } catch (error) {
              return null;
            }
          });
          await Promise.all(promises);
        }
        // console.log('payload', typeof packet.payload);
        Sensor.app.emit('publish', packet.topic, packet.payload, false, 0);
        return sensor;
      }
      throw new Error('Invalid MQTT Packet encoding');
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'publish:err', error);
      throw error;
    }
  };

  /**
   * When device found,validate sensor instance produced by IoTAgent
   * @method module:Sensor.compose
   * @param {object} device - found device instance
   * @param {object} attributes - IotAgent parsed message
   * @returns {object} sensor
   */
  Sensor.compose = async (device, attributes) => {
    try {
      let sensor = {};
      // const schema = Sensor.definition.properties
      // todo improve composition with attributes validation based on schema types
      if ((!device.sensors() || !device.sensors()[0]) && attributes.type) {
        sensor = {
          //  ...attributes,
          name: attributes.name || null,
          type: attributes.type,
          method: attributes.method,
          createdAt: Date.now(),
          lastSignal: attributes.lastSignal,
          resources: attributes.resources,
          resource: Number(attributes.resource),
          value: attributes.value,
          icons: attributes.icons,
          colors: attributes.colors,
          nativeType: attributes.nativeType,
          nativeResource: attributes.nativeResource,
          nativeSensorId: attributes.nativeSensorId,
          nativeNodeId: attributes.nativeNodeId || null,
          frameCounter: attributes.frameCounter || 0,
          inPrefix: attributes.inPrefix || null,
          outPrefix: attributes.outPrefix || null,
          inputPath: attributes.inputPath || null,
          outputPath: attributes.outputPath || null,
          transportProtocol: device.transportProtocol,
          transportProtocolVersion: device.transportProtocolVersion,
          messageProtocol: device.messageProtocol,
          messageProtocolVersion: device.messageProtocolVersion,
          devEui: device.devEui,
          devAddr: device.devAddr,
          ownerId: device.ownerId,
          isNewInstance: true,
        };
        logger.publish(4, `${collectionName}`, 'compose:create', {
          sensor,
        });
        let newSensor = await device.sensors.create(sensor);
        newSensor = JSON.parse(JSON.stringify(newSensor));
        return newSensor;
      }
      if (device.sensors()[0] && device.sensors()[0].id) {
        sensor = device.sensors()[0];
        sensor = JSON.parse(JSON.stringify(sensor));
        const keys = Object.keys(attributes);
        keys.forEach(key => {
          // special check for key === "value" ?
          if (key === 'resources') {
            // eslint-disable-next-line security/detect-object-injection
            sensor[key] = { ...attributes[key], ...sensor[key] };
          } else {
            // eslint-disable-next-line security/detect-object-injection
            sensor[key] = attributes[key];
          }
          return sensor;
        });
        sensor.isNewInstance = false;
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
        return sensor;
      }
      throw new Error('no sensor found and no known type to register a new one');
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'compose:err', error);
      throw error;
    }
  };

  /**
   * When HEAD method detected, update sensor instance ( not the value )
   * @method module:Sensor.handlePresentation
   * @param {object} device - found device instance
   * @param {object} sensor - Incoming sensor instance
   * @param {object} [client] - MQTT client
   * @returns {function} Sensor.publish
   */
  Sensor.handlePresentation = async (device, sensor, client) => {
    try {
      logger.publish(3, `${collectionName}`, 'handlePresentation:req', {
        deviceId: device.id,
        deviceName: device.name,
        sensorId: sensor.id,
        sensorName: sensor.name,
      });
      const SensorResource = Sensor.app.models.SensorResource;
      if (sensor.isNewInstance && sensor.icons) {
        sensor.method = 'HEAD';
        await SensorResource.setCache(device.id, sensor);
        // should be saved in compose
        // await device.sensors.updateById(sensor.id, sensor);
        return Sensor.publish(device, sensor, 'HEAD', client);
      }
      if (!sensor.isNewInstance && sensor.id) {
        let updatedSensor = await SensorResource.getCache(device.id, sensor.id);
        if (!updatedSensor) {
          throw utils.buildError(404, 'INVALID_SENSOR', 'Sensor not found');
        }
        updatedSensor = { ...updatedSensor, ...sensor };
        updatedSensor.method = 'HEAD';
        updatedSensor.frameCounter = 0;
        await SensorResource.setCache(device.id, updatedSensor);
        await device.sensors.updateById(sensor.id, updatedSensor);
        return Sensor.publish(device, updatedSensor, 'HEAD', client);
      }
      throw utils.buildError(400, 'INVALID_SENSOR', 'No valid sensor to register');
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'handlePresentation:req', error);
      throw error;
    }
  };

  /**
   * When POST or PUT method detected, validate sensor.resource and value, then save sensor instance
   * @method module:Sensor.createOrUpdate
   * @param {object} device - found Device instance
   * @param {object} sensor - Incoming Densor instance
   * @param {number} resourceKey - Sensor resource name ( OMA )
   * @param {object} resourceValue - Sensor resource value to save
   * @param {object} [client] - MQTT client
   * @returns {object} sensor
   */
  Sensor.createOrUpdate = async (device, sensor, resourceKey, resourceValue, client) => {
    try {
      logger.publish(3, `${collectionName}`, 'createOrUpdate:req', {
        sensorId: sensor.id,
        resourceKey,
        name: sensor.name,
      });

      if (resourceValue === undefined || resourceKey === undefined || resourceKey === null) {
        const error = utils.buildError(400, 'INVALID_ARGS', 'Missing Sensor key/value to update');
        throw error;
      }
      if (sensor.isNewInstance || !sensor || !sensor.id) {
        const error = utils.buildError(400, 'INVALID_SENSOR', 'Sensor not validated yet');
        throw error;
      }

      const SensorResource = Sensor.app.models.SensorResource;
      let updatedSensor = await SensorResource.getCache(sensor.deviceId, sensor.id);
      if (!updatedSensor || !updatedSensor.id) {
        throw utils.buildError(404, 'INVALID_SENSOR', 'Sensor not found in cache');
      }
      sensor.resources = { ...sensor.resources, ...updatedSensor.resources };
      updatedSensor = await updateAloesSensors(
        { ...updatedSensor, ...sensor },
        Number(resourceKey),
        resourceValue,
      );
      logger.publish(3, `${collectionName}`, 'createOrUpdate:res', {
        inType: typeof resourceValue,
        outType: typeof updatedSensor.resources[updatedSensor.resource],
      });

      updatedSensor.frameCounter += 1;
      // updatedSensor.value = null; free sensor space ?
      const lastSignal = new Date(updatedSensor.lastSignal).getTime();
      if (!updatedSensor.lastSync) {
        updatedSensor.lastSync = lastSignal;
      }

      const result = await persistingResource(Sensor.app, device, updatedSensor, client);
      if (result && result.sensor) {
        updatedSensor = result.sensor;
      }
      if (
        updatedSensor.frameCounter % 25 === 0 ||
        lastSignal > updatedSensor.lastSync + 30 * 1000
      ) {
        updatedSensor.lastSync = lastSignal;
        await device.sensors.updateById(sensor.id, updatedSensor);
      }
      // TODO : Define cache TTL with env vars ?
      await SensorResource.setCache(device.id, updatedSensor);
      await Sensor.publish(device, updatedSensor, 'PUT', client);
      return updatedSensor;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'createOrUpdate:err', error);
      throw error;
    }
  };

  /**
   * When GET method detected, find and publish instance
   * @method module:Sensor.getInstance
   * @param {object} device - found device instance
   * @param {object} pattern - IotAgent detected pattern
   * @param {object} sensor - Incoming sensor instance
   * @returns {function} Sensor.publish
   */
  Sensor.getInstance = async (device, pattern, sensor, client) => {
    try {
      logger.publish(4, `${collectionName}`, 'getInstance:req', {
        pattern,
      });
      const SensorResource = Sensor.app.models.SensorResource;
      let instance = await SensorResource.getCache(sensor.deviceId, sensor.id);
      if (!instance) {
        instance = await Sensor.findById(sensor.id);
      }
      if (!instance) throw new Error('Sensor not found');
      // if (pattern.name.toLowerCase() !== 'aloesclient') {
      //   let packet = { payload: JSON.stringify(instance) };
      //   packet = await iotAgent.decode(packet, pattern.params);
      //   if (packet.payload && packet.payload !== null) {
      //     return Sensor.app.publish(packet.topic, packet.payload, false, 1);
      //   }
      //   throw new Error('no packet payload to publish');
      // }
      //  const topic = `${params.appEui}/Sensor/HEAD`;
      await Sensor.publish(device, instance, 'GET', client);
      return instance;
    } catch (error) {
      throw error;
    }
  };

  // Sensor.prototype.__get__measurements = async filter => {
  //   console.log('GET SENSOR MEASUREMENTS', filter);
  //   return Sensor.app.models.Measurement.find(filter);
  // };

  /**
   * Build simple where filter based on given attributes
   * @param {object} pattern - IotAgent detected pattern
   * @param {object} sensor - Incoming sensor instance
   * @returns {function} Sensor.publish
   */
  // Sensor.buildWhere = attributes => {
  //   try {
  //     const filter = { where: {} };
  //     // check validAttributes
  //     const schema = Sensor.definition.properties;
  //     const schemaKeys = Object.keys(schema);
  //     const attributesKeys = Object.keys(attributes);
  //     if (attributesKeys.length > 1) {
  //       filter.where = { and: [] };
  //       attributesKeys.forEach(key =>
  //         schemaKeys.forEach(schemaKey => {
  //           if (schemaKey === key && attributes[key] !== null) {
  //             filter.where.and.push({
  //               [key]: attributes[key],
  //             });
  //           }
  //         }),
  //       );
  //     } else {
  //       schemaKeys.forEach(schemaKey => {
  //         if (schemaKey === attributesKeys[0] && attributes[attributesKeys[0]] !== null) {
  //           filter.where = {
  //             [attributesKeys[0]]: attributes[attributesKeys[0]],
  //           };
  //         }
  //       });
  //     }
  //     console.log('filter : ', filter);
  //     return filter;
  //   } catch (error) {
  //     return error;
  //   }
  // };

  /**
   * When sensor found, execute method extracted from MQTT topic
   * @param {object} device - Found device client
   * @param {object} sensor - Parsed external app message
   * @param {string} method - method from MQTT topic
   * @param {object} [client] - MQTT client
   * @returns {object} sensor
   */
  Sensor.execute = async (device, sensor, method, client) => {
    try {
      logger.publish(3, `${collectionName}`, 'execute:req', method);
      // also replace sensor when they share same nativeSensorId and nativeNodeId but type has changed ?
      switch (method.toUpperCase()) {
        case 'HEAD':
          await Sensor.handlePresentation(device, sensor, client);
          break;
        case 'GET':
          // await Sensor.getInstance(device, sensor, client);
          await Sensor.publish(device, sensor, 'GET', client);
          break;
        case 'POST':
          await Sensor.createOrUpdate(device, sensor, sensor.resource, sensor.value, client);
          break;
        case 'PUT':
          await Sensor.createOrUpdate(device, sensor, sensor.resource, sensor.value, client);
          break;
        case 'STREAM':
          //  return Sensor.publish(device, sensor, 'STREAM', client);
          break;
        case 'DELETE':
          await Sensor.deleteById(sensor.id);
          break;
        case 'ERROR':
          break;
        default:
          throw new Error('Unsupported method');
      }
      return sensor;
    } catch (error) {
      // publish error to client
      logger.publish(2, `${collectionName}`, 'execute:err', error);
      throw error;
    }
  };

  /**
   * Dispatch incoming MQTT packet
   * @method module:Sensor.onPublish
   * @param {object} device - Found Device instance
   * @param {object} attributes - Sensor attributes detected by Iot-Agent
   * @param {object} [sensor] - Found Sensor instance
   * @param {object} client - MQTT client
   * @returns {function} Sensor.execute
   */
  Sensor.onPublish = async (device, attributes, sensor, client) => {
    try {
      logger.publish(4, `${collectionName}`, 'onPublish:req', {
        sensor: sensor && sensor.id,
        attributes: attributes && attributes.devEui,
      });

      if (!sensor || sensor === null) {
        try {
          sensor = await Sensor.compose(
            device,
            attributes,
          );
        } catch (e) {
          sensor = null;
        }
      }
      if (sensor && sensor !== null) {
        let method = sensor.method;
        if (!method) {
          if (sensor.id && !sensor.isNewInstance) {
            method = 'PUT';
          } else {
            method = 'HEAD';
          }
        }
        logger.publish(4, `${collectionName}`, 'onPublish:res', {
          method,
        });
        return Sensor.execute(device, sensor, method, client);
      }
      const error = utils.buildError(400, 'INVALID_SENSOR', 'Error while building sensor instance');
      throw error;
    } catch (error) {
      // todo : publish error to client
      logger.publish(2, `${collectionName}`, 'onPublish:err', error);
      throw error;
    }
  };

  /**
   * Search sensor by keywords ( name, type, )
   * @method module:Sensor.search
   * @param {object} filter - Requested filter
   * @returns {array} sensors
   */
  Sensor.search = async filter => {
    logger.publish(4, `${collectionName}`, 'search:req', filter);
    if (
      !filter.text ||
      !isLength(filter.text, { min: 2, max: 30 }) ||
      !isAlphanumeric(filter.text)
    ) {
      throw new Error('Invalid search content');
    }
    try {
      /* eslint-disable security/detect-non-literal-regexp */
      // use OMA object description as lexic
      const omaObjectsList = await Sensor.app.models.OmaObject.find({
        where: {
          or: [
            { name: { like: new RegExp(`.*${filter.text}.*`, 'i') } },
            { id: { like: new RegExp(`.*${filter.text}.*`, 'i') } },
            { description: { like: new RegExp(`.*${filter.text}.*`, 'i') } },
          ],
        },
      });

      const promises = await omaObjectsList.map(async obj => {
        try {
          const whereFilter = {
            or: [
              { and: [{ name: { like: new RegExp(`.*${obj.name}.*`, 'i') } }, { type: obj.id }] },
              { transportProtocol: { like: new RegExp(`.*${filter.text}.*`, 'i') } },
            ],
          };
          const sensors = await Sensor.find({
            where: whereFilter,
          });
          return !sensors || sensors === null ? [] : [...JSON.parse(JSON.stringify(sensors))];
        } catch (e) {
          return null;
        }
      });
      /* eslint-enable security/detect-non-literal-regexp */

      const result = await Promise.all(promises);
      if (!result || result === null) {
        return [];
      }
      const sensors = utils.flatten(result);
      if (filter.limit && typeof filter.limit === 'number' && sensors.length > filter.limit) {
        sensors.splice(filter.limit, sensors.length - 1);
      }
      logger.publish(3, `${collectionName}`, 'search:res', sensors.length);
      return sensors;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'search:err', error);
      throw error;
    }
  };

  /**
   * Export sensors list from JSON to {format}
   * @method module:Sensor.export
   * @param {array} sensors
   * @param {string} [format]
   */
  Sensor.export = async (sensors, filter, format = 'csv') => {
    if (!sensors || sensors.length < 1) return null;
    if (format === 'csv') {
      sensors.forEach(sensor => {
        // eslint-disable-next-line security/detect-object-injection
        ['measurements', 'icons', 'resources', 'colors'].forEach(p => delete sensor[p]);
      });
      const result = utils.exportToCSV(sensors, filter);
      return result;
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
   * @returns {function} Sensor.onPublish
   */
  Sensor.on('publish', async message => {
    try {
      if (!message || message === null) throw new Error('Message empty');
      const { attributes, client, device, sensor } = message;
      //  const pattern = message.pattern;
      if (!device || (!attributes && !sensor)) throw new Error('Message missing properties');
      await Sensor.onPublish(device, attributes, sensor, client);
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'on-publish:err', error);
    }
  });

  /**
   * Event reporting that a sensor instance will be created or updated.
   * @event before_save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Sensor instance
   * @returns {function} Sensor~onBeforeSave
   */
  Sensor.observe('before save', onBeforeSave);

  /**
   * Event reporting that a sensor instance has been created or updated.
   * @event after_save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Sensor instance
   * @returns {function} Sensor~onAfterSave
   */
  Sensor.observe('after save', onAfterSave);

  /**
   * Event reporting that a/several sensor instance(s) will be deleted.
   * @event before_delete
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.where.id - Sensor id
   * @returns {function} Sensor~onBeforeDelete
   */
  Sensor.observe('before delete', onBeforeDelete);

  /**
   * Event reporting that a sensor method is requested
   * @event before_*
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @returns {function} Sensor~onBeforeRemote
   */
  Sensor.beforeRemote('**', async ctx => onBeforeRemote(Sensor.app, ctx));

  Sensor.afterRemoteError('*', (ctx, next) => {
    logger.publish(2, `${collectionName}`, `after ${ctx.methodString}:err`, '');
    next();
  });

  /**
   * Find sensors
   * @method module:Sensor.find
   * @param {object} filter
   * @returns {object}
   */

  /**
   * Returns sensors length
   * @method module:Sensor.count
   * @param {object} where
   * @returns {number}
   */

  /**
   * Find sensor by id
   * @method module:Sensor.findById
   * @param {any} id
   * @param {object} filter
   * @returns {object}
   */

  /**
   * Create sensor
   * @method module:Sensor.create
   * @param {object} sensor
   * @returns {object}
   */

  /**
   * Update sensor by id
   * @method module:Sensor.updateById
   * @param {any} id
   * @param {object} filter
   * @returns {object}
   */

  /**
   * Delete sensor by id
   * @method module:Sensor.deleteById
   * @param {any} id
   * @param {object} filter
   * @returns {object}
   */

  Sensor.disableRemoteMethodByName('upsertWithWhere');
  Sensor.disableRemoteMethodByName('replaceOrCreate');
  Sensor.disableRemoteMethodByName('createChangeStream');

  Sensor.disableRemoteMethodByName('prototype.__create__measurements');
  Sensor.disableRemoteMethodByName('prototype.__count__measurements');
  Sensor.disableRemoteMethodByName('prototype.__updateById__measurements');
  Sensor.disableRemoteMethodByName('prototype.__delete__measurements');
  Sensor.disableRemoteMethodByName('prototype.__deleteById__measurements');
  Sensor.disableRemoteMethodByName('prototype.__link__measurements');
  Sensor.disableRemoteMethodByName('prototype.__unlink__measurements');
};
