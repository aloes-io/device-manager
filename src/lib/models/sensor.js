/* Copyright 2020 Edouard Maleix, read LICENSE */

import { omaObjects, omaResources } from 'oma-json';
import isLength from 'validator/lib/isLength';
import logger from '../../services/logger';
import protocols from '../../initial-data/protocols.json';
import utils from '../utils';

export const collectionName = 'Sensor';
// const filteredProperties = ['children', 'size', 'show', 'group', 'success', 'error'];
const filteredProperties = ['resources', 'children', 'size', 'show', 'group', 'success', 'error'];

const savedMethods = {
  buffer: 10,
  location: 20,
  log: 30,
  measurement: 40,
  scheduler: 50,
};

/**
 * Error callback
 * @callback module:Sensor~errorCallback
 * @param {error} ErrorObject
 */

/**
 * Validate sensor type before saving instance
 * @method module:Sensor~typeValidator
 * @param {ErrorCallback} err
 */
export function typeValidator(err) {
  if (
    !this.type ||
    !isLength(this.type.toString(), { min: 1, max: 4 }) ||
    !omaObjects.some(object => object.value === this.type)
  ) {
    err();
  }
}

/**
 * Validate sensor resource before saving instance
 * @method module:Sensor~resourceValidator
 * @param {ErrorCallback} err
 */
export function resourceValidator(err) {
  // todo : check if this.resource is in omaObjects[this.type].resources
  if (
    this.resource === undefined ||
    this.resource === null ||
    !isLength(this.resource.toString(), { min: 1, max: 4 }) ||
    !omaResources.some(resource => resource.value === this.resource)
  ) {
    err();
  }
}

/**
 * Validate sensor transportProtocol before saving instance
 * @method module:Sensor~transportProtocolValidator
 * @param {ErrorCallback} err
 */
export function transportProtocolValidator(err) {
  if (
    !this.transportProtocol ||
    !protocols.transport.some(p => p.toLowerCase() === this.transportProtocol.toLowerCase())
  ) {
    err();
  }
}

/**
 * Validate sensor messageProtocol before saving instance
 * @method module:Sensor~messageProtocolValidator
 * @param {ErrorCallback} err
 */
export function messageProtocolValidator(err) {
  if (
    !this.messageProtocol ||
    !protocols.message.some(p => p.toLowerCase() === this.messageProtocol.toLowerCase())
  ) {
    err();
  }
}

/**
 * Compose a sensor instance from a device and retrieved attributes
 * @method module:Sensor~compose
 * @param {object} device - Device instance
 * @param {object} attributes - Sensor attributes
 * @param {object} isNewInstance - Flag to indicate that the sensor is a new instance
 * @returns {object} sensor
 */
export const compose = (device, attributes, isNewInstance = true) => {
  let sensor;
  // todo improve composition with attributes validation based on schema types using yup lib ?
  if (isNewInstance) {
    sensor = {
      name: attributes.name || null,
      type: attributes.type,
      method: attributes.method,
      createdAt: Date.now(),
      lastSignal: attributes.lastSignal || Date.now(),
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
      isNewInstance,
    };
  } else {
    sensor = device.sensors()[0];
    // sensor = JSON.parse(JSON.stringify(sensor));
    const keys = Object.keys(attributes);
    keys.forEach(key => {
      // special check for key === "value" ?
      // eslint-disable-next-line security/detect-object-injection
      sensor[key] = attributes[key] || sensor[key];
    });
    sensor.lastSignal = attributes.lastSignal || Date.now();
    sensor.isNewInstance = isNewInstance;
    sensor.devEui = device.devEui;
    sensor.devAddr = device.devAddr;
    sensor.transportProtocol = device.transportProtocol;
    sensor.transportProtocolVersion = device.transportProtocolVersion;
    sensor.messageProtocol = device.messageProtocol;
    sensor.messageProtocolVersion = device.messageProtocolVersion;
    sensor.ownerId = device.ownerId;
  }
  logger.publish(3, `${collectionName}`, 'compose:res', {
    sensor,
    isNewInstance,
  });
  return sensor;
};

// /**
//  * Build simple where filter based on given attributes
//  * @method module:Sensor~buildWhere
//  * @param {object} pattern - IotAgent detected pattern
//  * @param {object} sensor - Incoming sensor instance
//  */
// export const buildWhere = attributes => {
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

/* eslint-disable no-underscore-dangle */
/* eslint-disable camelcase */
export const getResources = async sensor => sensor.__get__resources(sensor.deviceId, sensor.id);

export const replaceResources = async (sensor, resources) => sensor.__replace__resources(resources);

export const deleteResources = async sensor => sensor.__delete__resources();
/* eslint-enable no-underscore-dangle */
/* eslint-enable camelcase */

const methodsByType = {
  boolean: (sensorType, resource) => {
    switch (resource) {
      case 5532:
        // increase input state
        return savedMethods.log;
      case 5533:
        // decrease input state
        return savedMethods.log;
      case 5543:
        // timer output state
        return savedMethods.scheduler;
      case 5850:
        // switch state
        return sensorType === 3340 ? savedMethods.scheduler : savedMethods.measurement;
      default:
        return savedMethods.measurement;
    }
  },
  integer: (_, resource) => {
    switch (resource) {
      case 5526:
        // scheduler mode
        return savedMethods.scheduler;
      case 5534:
        // scheduler output transitions counter
        return savedMethods.scheduler;
      case 5910:
        // bitmap input
        return savedMethods.buffer;
      default:
        return savedMethods.measurement;
    }
  },
  float: (_, resource) => {
    switch (resource) {
      case 5521:
        // duration of the time delay
        return savedMethods.scheduler;
      case 5524:
        // sound duration
        return savedMethods.scheduler;
      case 5525:
        // minimum off time
        return savedMethods.scheduler;
      case 5538:
        // remaining time
        return savedMethods.scheduler;
      case 5544:
        // cumulative time that timer input is true
        return savedMethods.scheduler;
      case 5824:
        // Time when the load control event will start started.
        return savedMethods.scheduler;
      case 5825:
        // The duration of the load control event.
        return savedMethods.scheduler;
      default:
        return savedMethods.measurement;
    }
  },
  opaque: (_, resource) => {
    if (resource === 5917) {
      return savedMethods.measurement;
    } else if (resource === 5522) {
      return savedMethods.buffer;
    }
    return null;
  },
  time: () => savedMethods.log,
  string: (_, resource) => {
    switch (resource) {
      case 5514:
        // latitude
        return savedMethods.location;
      case 5515:
        // longitude
        return savedMethods.location;
      default:
        return savedMethods.log;
    }
  },
  null: (sensorType, resource) => {
    switch (resource) {
      case 5505:
        // Reset the counter value
        return savedMethods.log;
      case 5523:
        // Trigger initing actuation
        return sensorType === 3339 ? savedMethods.log : savedMethods.scheduler;
      case 5530:
        // Command to clear display
        return savedMethods.log;
      case 5650:
        // Reset min and max current values
        return savedMethods.log;
      case 5822:
        // Reset cumulative energy
        return savedMethods.log;
      case 5911:
        // Reset bitmap input value
        return savedMethods.log;
      default:
        return null;
    }
  },
};

/**
 * Define the way to persist data based on OMA resource type
 *
 * SaveMethods :
 * buffer: 10,
 * location: 20,
 * log: 30,
 * measurement: 40,
 * scheduler: 50,
 *
 * @method module:Sensor~getPersistingMethod
 * @param {string} sensorType - OMA object Id
 * @param {number} resource - OMA resource ID
 * @param {string} type - OMA resource type
 * @returns {number} method
 */
export const getPersistingMethod = (sensorType, resource, type) => {
  logger.publish(5, `${collectionName}`, 'getPersistingMethod:req', {
    type,
  });
  if (!sensorType || !resource) return null;
  const saveMethod = methodsByType[type ? type.toLowerCase() : null](sensorType, resource);
  logger.publish(3, `${collectionName}`, 'getPersistingMethod:res', {
    method: saveMethod,
  });
  return saveMethod;
};

/**
 * Save a sensor resource as a file
 * @async
 * @method module:Sensor~saveFile
 * @param {object} app - Loopback app
 * @param {object} sensor - Sensor instance
 * @returns {Promise<object>} fileMeta
 */
const saveFile = async (app, sensor) => {
  const Files = app.models.Files;
  const buffer = await Files.compose(sensor);
  // todo limit buffer size ?  send error ?
  const fileMeta = await Files.uploadBuffer(
    buffer,
    sensor.ownerId.toString(),
    `${sensor.deviceId.toString()}-${sensor.id.toString()}`,
  );
  return fileMeta;
};

/**
 * Save a sensor resource as a measurement
 * @async
 * @method module:Sensor~saveMeasurement
 * @param {object} app - Loopback app
 * @param {object} sensor - Sensor instance
 * @param {object} client - MQTT client
 * @returns {Promise<object | null>} measurement
 */
const saveMeasurement = async (app, sensor, client) => {
  const Measurement = app.models.Measurement;
  const point = Measurement.compose(sensor);
  const measurement = await Measurement.create(point);
  if (measurement && measurement.id) {
    //  console.log('influx measurement : ', measurement.id);
    // todo fix id generation error
    await Measurement.publish(sensor.deviceId, measurement.id, 'POST', client);
    return measurement;
  }
  return null;
};

/**
 * Save a sensor resource as a timer
 * @async
 * @method module:Sensor~saveScheduler
 * @param {object} app - Loopback app
 * @param {object} sensor - Sensor instance
 * @param {object} client - MQTT client
 * @returns {Promise<object>} scheduler
 */
const saveScheduler = async (app, sensor, client) => {
  const Scheduler = app.models.Scheduler;
  const scheduler = await Scheduler.createOrUpdate(sensor, client);
  return scheduler;
};

const saveSensorRelations = {
  [savedMethods.buffer]: saveFile,
  [savedMethods.log]: async () => {
    // save ( append ) resource in log file ( in device container ) then use utils.liner to access it later
    return {};
  },
  [savedMethods.location]: async () => {
    // also update device.address with reverse geocoding?
    return {};
  },
  [savedMethods.measurement]: saveMeasurement,
  [savedMethods.scheduler]: saveScheduler,
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
 * @param {object} sensor - Sensor instance
 * @param {object} [client] - MQTT client
 * @returns {Promise<object>} result - saved value
 */
export const persistingResource = async (app, sensor, client) => {
  logger.publish(5, `${collectionName}`, 'persistingResource:req', {
    resource: sensor.resource,
  });
  try {
    const resourceModel = await app.models.OmaResource.findById(sensor.resource);
    // if (!resourceModel) throw new Error('OMA Resource does not exist');
    const method = getPersistingMethod(sensor.type, resourceModel.id, resourceModel.type);
    // eslint-disable-next-line security/detect-object-injection
    if (!method || !saveSensorRelations[method]) {
      return null;
    }
    // eslint-disable-next-line security/detect-object-injection
    return saveSensorRelations[method](app, sensor, client);
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'persistingResource:err', error);
    return null;
  }
};

/**
 * Validate instance before creation
 * @method module:Sensor~onBeforeSave
 * @param {object} ctx - Loopback context
 * @returns {Promise<object>} ctx
 */
export const onBeforeSave = async ctx => {
  // if (ctx.options && ctx.options.skipPropertyFilter) return ctx;
  if (ctx.instance) {
    logger.publish(4, `${collectionName}`, 'onBeforeSave:req', ctx.instance);
    if (ctx.instance.id) {
      if (ctx.instance.resources) {
        await replaceResources(ctx.instance, ctx.instance.resources);
      }
      await Promise.all(filteredProperties.map(p => ctx.instance.unsetAttribute(p)));
    } else {
      ctx.instance.createdAt = new Date();
    }
    // ctx.instance.lastSignal = new Date();
  } else if (ctx.data) {
    logger.publish(4, `${collectionName}`, 'onBeforePartialSave:req', ctx.data);
    if (ctx.data.resources) {
      if (ctx.where && ctx.where.id && !ctx.where.id.inq) {
        const sensor = await ctx.Model.findById(ctx.where.id);
        await replaceResources(sensor, ctx.data.resources);
      } else {
        const sensors = await ctx.Model.find({ where: ctx.where });
        if (sensors && sensors.length > 0) {
          await Promise.all(
            sensors.map(async sensor => replaceResources(sensor, ctx.data.resources)),
          );
        }
      }
    }
    // eslint-disable-next-line security/detect-object-injection
    filteredProperties.map(p => delete ctx.data[p]);
    ctx.hookState.updateData = ctx.data;
  }
  return ctx;
};

/**
 * Create relations on instance creation
 * @method module:Sensor~onAfterSave
 * @param {object} ctx - Loopback context
 * @returns {Promise<object>} ctx
 */
export const onAfterSave = async ctx => {
  logger.publish(4, `${collectionName}`, 'onAfterSave:req', ctx.hookState);
  if (ctx.isNewInstance && ctx.instance.id && ctx.instance.resources) {
    await replaceResources(ctx.instance, ctx.instance.resources);
  }
  // if (ctx.hookState.updateData) {}
  return ctx;
};

/**
 * Remove sensor dependencies
 * @method module:Sensor~deleteProps
 * @param {object} app - Loopback app
 * @param {object} instance
 * @returns {Promise<boolean>}
 */
const deleteProps = async (app, sensor) => {
  try {
    logger.publish(4, `${collectionName}`, 'deleteProps:req', sensor);
    await app.models.Measurement.destroyAll({
      sensorId: sensor.id.toString(),
    }).catch(e => e);
    await deleteResources(sensor);
    await app.models.Sensor.publish(sensor.deviceId, sensor, 'DELETE');
    return true;
  } catch (error) {
    logger.publish(3, `${collectionName}`, 'deleteProps:err', error);
    return false;
  }
};

/**
 * Delete relations on instance(s) deletetion
 * @method module:Sensor~onBeforeDelete
 * @param {object} ctx - Loopback context
 * @returns {Promise<object>} ctx
 */
export const onBeforeDelete = async ctx => {
  logger.publish(4, `${collectionName}`, 'onBeforeDelete:req', ctx.where);
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
};

/**
 * Called when a remote method tries to access Sensor Model / instance
 * @method module:Sensor~onBeforeRemote
 * @param {object} app - Loopback App
 * @param {object} ctx - Express context
 * @param {object} ctx.req - Request
 * @param {object} ctx.res - Response
 * @returns {Promise<object>} context
 */
export const onBeforeRemote = async (app, ctx) => {
  if (ctx.method.name.indexOf('find') !== -1 || ctx.method.name.indexOf('get') !== -1) {
    const options = ctx.options || {};
    const isAdmin = options.currentUser.roles.includes('admin');
    const ownerId = utils.getOwnerId(options);
    if (ctx.req.query && ctx.req.query.filter && !isAdmin) {
      if (typeof ctx.req.query.filter === 'string') {
        ctx.req.query.filter = JSON.parse(ctx.req.query.filter);
      }
      if (!ctx.req.query.filter.where) ctx.req.query.filter.where = {};
      ctx.req.query.filter.where.ownerId = ownerId;
    }
  } else if (ctx.method.name === 'search' || ctx.method.name === 'geoLocate') {
    const options = ctx.options || {};
    const isAdmin = options.currentUser.roles.includes('admin');
    if (!isAdmin) {
      if (!ctx.args.filter) ctx.args.filter = {};
      ctx.args.filter.ownerId = options.currentUser.id.toString();
    }
  }

  return ctx;
};
