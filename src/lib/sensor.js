/* Copyright 2020 Edouard Maleix, read LICENSE */

import { omaObjects, omaResources } from 'oma-json';
import isLength from 'validator/lib/isLength';
import logger from '../services/logger';
import utils from '../services/utils';
import protocols from '../initial-data/protocols.json';

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

export function typeValidator(err) {
  if (
    !this.type ||
    !isLength(this.type.toString(), { min: 1, max: 4 }) ||
    !omaObjects.some(object => object.value === this.type)
  ) {
    err();
  }
}

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

export function transportProtocolValidator(err) {
  if (
    !this.transportProtocol ||
    !protocols.transport.some(p => p.toLowerCase() === this.transportProtocol.toLowerCase())
  ) {
    err();
  }
}

export function messageProtocolValidator(err) {
  if (
    !this.messageProtocol ||
    !protocols.message.some(p => p.toLowerCase() === this.messageProtocol.toLowerCase())
  ) {
    err();
  }
}

export const compose = (device, attributes, newInstance = true) => {
  let sensor;
  // todo improve composition with attributes validation based on schema types using yup lib ?
  if (newInstance) {
    sensor = {
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
  } else {
    sensor = device.sensors()[0];
    // sensor = JSON.parse(JSON.stringify(sensor));
    const keys = Object.keys(attributes);
    keys.forEach(key => {
      // special check for key === "value" ?
      // if (key === 'resources') {
      //   // eslint-disable-next-line security/detect-object-injection
      //   sensor[key] = { ...attributes[key], ...sensor[key] };
      // } else {
      //   // eslint-disable-next-line security/detect-object-injection
      //   sensor[key] = attributes[key];
      // }
      // eslint-disable-next-line security/detect-object-injection
      sensor[key] = attributes[key];
    });
    sensor.isNewInstance = false;
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
    newInstance,
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
  let saveMethod;
  if (!sensorType || !resource) return null;
  if (!type || type === null) {
    switch (resource) {
      case 5505:
        // Reset the counter value
        saveMethod = savedMethods.log;
        break;
      case 5523:
        // Trigger initing actuation
        if (sensorType === 3339) {
          saveMethod = savedMethods.log;
        } else {
          saveMethod = savedMethods.scheduler;
        }
        break;
      case 5530:
        // Command to clear display
        saveMethod = savedMethods.log;
        break;
      case 5650:
        // Reset min and max current values
        saveMethod = savedMethods.log;
        break;
      case 5822:
        // Reset cumulative energy
        saveMethod = savedMethods.log;
        break;
      case 5911:
        // Reset bitmap input value
        saveMethod = savedMethods.log;
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
            saveMethod = savedMethods.location;
            break;
          case 5515:
            // longitude
            saveMethod = savedMethods.location;
            break;
          default:
            saveMethod = savedMethods.log;
        }
        break;
      case 'integer':
        switch (resource) {
          case 5526:
            // scheduler mode
            saveMethod = savedMethods.scheduler;
            break;
          case 5534:
            // scheduler output transitions counter
            saveMethod = savedMethods.scheduler;
            break;
          case 5910:
            // bitmap input
            saveMethod = savedMethods.buffer;
            break;
          default:
            saveMethod = savedMethods.measurement;
        }
        break;
      case 'float':
        switch (resource) {
          case 5521:
            // duration of the time delay
            saveMethod = savedMethods.scheduler;
            break;
          case 5524:
            // sound duration
            saveMethod = savedMethods.scheduler;
            break;
          case 5525:
            // minimum off time
            saveMethod = savedMethods.scheduler;
            break;
          case 5538:
            // remaining time
            saveMethod = savedMethods.scheduler;
            break;
          case 5544:
            // cumulative time that timer input is true
            saveMethod = savedMethods.scheduler;
            break;
          case 5824:
            // Time when the load control event will start started.
            saveMethod = savedMethods.scheduler;
            break;
          case 5825:
            // The duration of the load control event.
            saveMethod = savedMethods.scheduler;
            break;
          default:
            saveMethod = savedMethods.measurement;
        }
        break;
      case 'boolean':
        switch (resource) {
          case 5532:
            // increase input state
            saveMethod = savedMethods.log;
            break;
          case 5533:
            // decrease input state
            saveMethod = savedMethods.log;
            break;
          case 5543:
            // timer output state
            saveMethod = savedMethods.scheduler;
            break;
          case 5850:
            // switch state
            if (sensorType === 3340) {
              saveMethod = savedMethods.scheduler;
            } else {
              saveMethod = savedMethods.measurement;
            }
            break;
          default:
            saveMethod = savedMethods.measurement;
        }
        break;
      case 'time':
        saveMethod = savedMethods.log;
        break;
      case 'opaque':
        if (resource === 5917) {
          saveMethod = savedMethods.measurement;
        } else if (resource === 5522) {
          saveMethod = savedMethods.buffer;
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

const saveFile = async (app, sensor) => {
  const Files = app.models.Files;
  try {
    const buffer = await Files.compose(sensor);
    // todo limit buffer size ?  send error ?
    const fileMeta = await Files.uploadBuffer(
      buffer,
      sensor.ownerId.toString(),
      `${sensor.deviceId.toString()}-${sensor.id.toString()}`,
    );
    return fileMeta;
  } catch (e) {
    logger.publish(3, `${collectionName}`, 'saveFile:err', e);
    return null;
  }
};

const saveMeasurement = async (app, sensor, client) => {
  const Measurement = app.models.Measurement;
  try {
    const measurement = await Measurement.compose(sensor);
    const point = await Measurement.create(measurement);
    if (point && point.id) {
      //  console.log('influx measurement : ', point.id);
      // todo fix id generation error
      await Measurement.publish(sensor.deviceId, point.id, 'POST', client);
      return point;
    }
    return null;
  } catch (e) {
    logger.publish(3, `${collectionName}`, 'saveMeasurement:err', e);
    return null;
  }
};

const saveScheduler = async (app, sensor, client) => {
  const Scheduler = app.models.Scheduler;
  try {
    const scheduler = await Scheduler.createOrUpdate(sensor, client);
    return scheduler;
  } catch (e) {
    logger.publish(3, `${collectionName}`, 'saveScheduler:err', e);
    return null;
  }
};

const saveSensorRelations = {
  [savedMethods.buffer]: saveFile,
  // [savedMethods.log]: () => {save ( append ) resource in log file ( in device container ) then use utils.liner to access it later},
  // [savedMethods.location]: () => {also update device.address with reverse geocoding?},
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
 * @returns {object} result - saved value
 */
export const persistingResource = async (app, sensor, client) => {
  try {
    logger.publish(5, `${collectionName}`, 'persistingResource:req', {
      resource: sensor.resource,
    });
    const resourceModel = await app.models.OmaResource.findById(sensor.resource);
    if (!resourceModel) throw new Error('OMA Resource does not exist');
    const method = getPersistingMethod(sensor.type, resourceModel.id, resourceModel.type);
    if (!method || method === null) return null;
    // eslint-disable-next-line security/detect-object-injection
    const persistedResource = await saveSensorRelations[method](app, sensor, client);
    return { persistedResource, sensor };
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'persistingResource:err', error);
    return null;
  }
};

export const updateProps = async sensor => {
  try {
    if (sensor.resources) {
      await replaceResources(sensor, sensor.resources);
    }
  } catch (error) {
    logger.publish(3, `${collectionName}`, 'updateProps:err', error);
  }
};

/**
 * Validate instance before creation
 * @method module:Sensor~onBeforeSave
 * @param {object} ctx - Loopback context
 * @returns {object} ctx
 */
export const onBeforeSave = async ctx => {
  // if (ctx.options && ctx.options.skipPropertyFilter) return ctx;
  if (ctx.instance && ctx.instance.id) {
    logger.publish(4, `${collectionName}`, 'onBeforeSave:req', ctx.instance);
    await updateProps(ctx.instance);
    await Promise.all(filteredProperties.map(p => ctx.instance.unsetAttribute(p)));
  } else if (ctx.data) {
    logger.publish(4, `${collectionName}`, 'onBeforePartialSave:req', ctx.data);
    if (ctx.data.resources) {
      if (ctx.where && ctx.where.id && !ctx.where.id.inq) {
        const sensor = await ctx.Model.findById(ctx.where.id);
        sensor.resources = ctx.data.resources;
        await updateProps(sensor);
      } else {
        const sensors = await ctx.Model.find({ where: ctx.where });
        if (sensors && sensors.length > 0) {
          await Promise.all(
            sensors.map(async sensor => {
              sensor.resources = ctx.data.resources;
              return updateProps(sensor);
            }),
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
 * @returns {object} ctx
 */
export const onAfterSave = async ctx => {
  logger.publish(3, `${collectionName}`, 'onAfterSave:req', ctx.hookState);
  if (ctx.isNewInstance && ctx.instance.id) {
    await updateProps(ctx.instance);
  }
  // if (ctx.hookState.updateData) {}
  // await ctx.Model.publish(ctx.instance.deviceId, ctx.instance, ctx.instance.method, client);
  return ctx;
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
    await app.models.Measurement.destroyAll({
      sensorId: sensor.id.toString(),
    }).catch(e => e);
    await deleteResources(sensor);
    await app.models.Sensor.publish(sensor.deviceId, sensor, 'DELETE');
  } catch (error) {
    logger.publish(3, `${collectionName}`, 'deleteProps:err', error);
  }
};

/**
 * Delete relations on instance(s) deletetion
 * @method module:Sensor~onBeforeDelete
 * @param {object} ctx - Loopback context
 * @returns {object} ctx
 */
export const onBeforeDelete = async ctx => {
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
};

/**
 * Called when a remote method tries to access Sensor Model / instance
 * @method module:Sensor~onBeforeRemote
 * @param {object} app - Loopback App
 * @param {object} ctx - Express context
 * @param {object} ctx.req - Request
 * @param {object} ctx.res - Response
 * @returns {object} context
 */
export const onBeforeRemote = async (app, ctx) => {
  if (ctx.method.name.indexOf('find') !== -1 || ctx.method.name.indexOf('get') !== -1) {
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
    }
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
};
