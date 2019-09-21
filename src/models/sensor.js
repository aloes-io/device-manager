import iotAgent from 'iot-agent';
import { updateAloesSensors } from 'aloes-handlers';
import logger from '../services/logger';
import utils from '../services/utils';

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
      const promises = await filteredProperties.map(async p => ctx.instance.unsetAttribute(p));
      await Promise.all(promises);
    } else if (ctx.data) {
      logger.publish(5, `${collectionName}`, 'onBeforePartialSave:req', '');
      const promises = await filteredProperties.map(p => delete ctx.data[p]);
      await Promise.all(promises);
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
 * @method module:Sensor~getPersistingMethod
 * @param {string} sensorType - OMA object Id
 * @param {number} resource - OMA resource ID
 * @param {string} type - OMA resource type
 * @returns {string} method
 */
const getPersistingMethod = (sensorType, resource, type) => {
  try {
    // savingProcess = "measurement" || "buffer" || "log"
    logger.publish(4, `${collectionName}`, 'getPersistingMethod:req', {
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
          saveMethod = 'scheduler';
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
          } else if (resource === 5922) {
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
  } catch (error) {
    console.log('persistingmethod:err', error);
    return null;
  }
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
    logger.publish(4, `${collectionName}`, 'persistingResource:req', {
      resource: sensor.resource,
    });
    const resourceModel = await app.models.OmaResource.findById(sensor.resource);
    const method = await getPersistingMethod(sensor.type, resourceModel.id, resourceModel.type);
    let result;
    let persistedResource = {};
    if (!method || method === null) return null;
    //  if (!method || method === null) throw new Error('Invalid saving method');
    if (method === 'measurement') {
      const Measurement = app.models.Measurement;
      const measurement = await Measurement.compose(sensor);
      if (measurement && measurement !== null) {
        const point = await Measurement.create(measurement);
        //  console.log('influx measurement : ', point.id);
        // todo fix id generation error
        await Measurement.publish(device, point.id, 'POST', client);
        persistedResource = point;
      }
    } else if (method === 'log') {
      // in the future add to elastic search db ?
      // todo save ( append ) resource in log file ( in device container ) then use utils.liner to access it later
    } else if (method === 'location') {
      // also update device.address with reverse geocoding ?
    } else if (method === 'buffer') {
      const Files = app.models.Files;
      const buffer = await Files.compose(sensor);
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
    logger.publish(3, `${collectionName}`, 'persist:err', error);
    return error;
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
    logger.publish(4, `${collectionName}`, 'onAfterSave:req', ctx.hookState);
    if (ctx.hookState.updateData) {
      return ctx;
      //  } else if (ctx.instance.id && !ctx.isNewInstance && ctx.instance.ownerId) {
    } else if (ctx.instance.id && ctx.instance.ownerId) {
      await ctx.Model.app.models.SensorResource.setCache(ctx.instance.deviceId, ctx.instance);
    }
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onAfterSave:err', error);
    throw error;
  }
};

const deleteProps = async (app, sensor) => {
  try {
    if (!sensor || !sensor.id || !sensor.ownerId) {
      throw utils.buildError(403, 'INVALID_SENSOR', 'Invalid sensor instance');
    }
    logger.publish(2, `${collectionName}`, 'deleteProps:req', sensor);
    const device = await app.models.Device.findById(sensor.deviceId);
    await app.models.Measurement.destroyAll({
      sensorId: sensor.id.toString(),
    });
    // not working properly, why ?
    //  await SensorResource.delete(instance.deviceId, instance.id);
    await app.models.SensorResource.expireCache(sensor.deviceId, sensor.id, 1);
    await app.models.Sensor.publish(device, sensor, 'DELETE');
    return sensor;
  } catch (error) {
    throw error;
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
    logger.publish(4, `${collectionName}`, 'onBeforeDelete:req', ctx.where);
    if (ctx.where && ctx.where.id && !ctx.where.id.inq) {
      const sensor = await ctx.Model.findById(ctx.where.id);
      await deleteProps(ctx.Model.app, sensor);
    } else {
      const filter = { where: ctx.where };
      const sensors = await ctx.Model.find(filter);
      await Promise.all(sensors.map(async sensor => deleteProps(ctx.Model.app, sensor)));
    }
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onBeforeDelete:err', error);
    throw error;
  }
};

const onBeforeRemote = async ctx => {
  try {
    if (ctx.method.name === 'search' || ctx.method.name === 'geoLocate') {
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
  async function typeValidator(err) {
    if (this.type && this.type.toString().length <= 4) {
      if (await Sensor.app.models.OmaObject.exists(this.type)) {
        return;
      }
    }
    err();
  }

  async function resourceValidator(err) {
    if (this.resource && this.resource.toString().length <= 4) {
      if (await Sensor.app.models.OmaResource.exists(this.resource)) {
        return;
      }
    }
    err();
  }

  async function transportProtocolValidator(err) {
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

  async function messageProtocolValidator(err) {
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

  /**
   * Format packet and send it via MQTT broker
   * @method module:Sensor.publish
   * @param {object} device - found Device instance
   * @param {object} sensor - Sensor instance
   * @param {string} [method] - MQTT API method
   * @param {object} [client] - MQTT client target
   * @fires {event} module:Server.publish
   */
  Sensor.publish = async (device, sensor, method, client) => {
    try {
      let publishMethod = method || sensor.method;
      if (sensor.isNewInstance && !publishMethod) {
        publishMethod = 'POST';
      } else if (!publishMethod) {
        publishMethod = method || sensor.method || 'PUT';
      }
      const packet = await iotAgent.publish({
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
        if (client && (client.ownerId || client.appId)) {
          const pattern = await iotAgent.patternDetector(packet);
          let nativePacket = { topic: packet.topic, payload: JSON.stringify(sensor) };
          nativePacket = await iotAgent.decode(nativePacket, pattern.params);
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
          const promises = await device.appIds.map(async appId => {
            try {
              const parts = packet.topic.split('/');
              parts[0] = appId;
              const topic = parts.join('/');
              Sensor.app.emit('publish', topic, packet.payload, false, 0);
              return topic;
            } catch (error) {
              return error;
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
      return error;
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
      } else if (device.sensors()[0] && device.sensors()[0].id) {
        sensor = device.sensors()[0];
        sensor = JSON.parse(JSON.stringify(sensor));
        const keys = Object.keys(attributes);
        keys.forEach(key => {
          // special check for key === value ?
          if (key === 'resources') {
            sensor[key] = { ...attributes[key], ...sensor[key] };
          } else {
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
      throw error;
    }
  };

  /**
   * When HEAD detected, validate sensor.resource and value, then save sensor instance
   * @method module:Sensor.handlePresentation
   * @param {object} device - found device instance
   * @param {object} sensor - Incoming sensor instance
   * @param {object} [client] - MQTT client
   * @returns {function} sensor.create
   * @returns {function} sensor.updateAttributes
   */
  Sensor.handlePresentation = async (device, sensor, client) => {
    try {
      logger.publish(4, `${collectionName}`, 'handlePresentation:req', {
        deviceId: device.id,
        deviceName: device.name,
        sensorId: sensor.id,
        sensorName: sensor.name,
      });
      const SensorResource = Sensor.app.models.SensorResource;
      if (sensor.isNewInstance && sensor.icons) {
        sensor.method = 'HEAD';
        await SensorResource.setCache(device.id, sensor);
        //  await device.sensors.updateById(sensor.id, sensor);
        return Sensor.publish(device, sensor, 'HEAD', client);
      } else if (!sensor.isNewInstance && sensor.id) {
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
      console.log('Presentation err:', error);
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
   * @returns {function} sensor.publish
   */
  Sensor.createOrUpdate = async (device, sensor, resourceKey, resourceValue, client) => {
    try {
      logger.publish(4, `${collectionName}`, 'createOrUpdate:req', {
        sensorId: sensor.id,
        resourceKey,
        name: sensor.name,
      });

      if (sensor.isNewInstance) {
        const error = utils.buildError(400, 'INVALID_SENSOR', 'Sensor not validated yet');
        throw error;
      }
      if (resourceValue === undefined || resourceKey === undefined || resourceKey === null) {
        const error = utils.buildError(400, 'INVALID_ARGS', 'Missing Sensor key/value to update');
        throw error;
      }

      const SensorResource = Sensor.app.models.SensorResource;
      if (sensor.id) {
        let updatedSensor = await SensorResource.getCache(sensor.deviceId, sensor.id);
        if (!updatedSensor || !updatedSensor.id) {
          throw utils.buildError(404, 'INVALID_SENSOR', 'Sensor not found');
        }
        sensor.resources = { ...sensor.resources, ...updatedSensor.resources };
        updatedSensor = await updateAloesSensors(
          { ...updatedSensor, ...sensor },
          Number(resourceKey),
          resourceValue,
        );
        logger.publish(4, `${collectionName}`, 'createOrUpdate:res', {
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
          // delete updatedSensor.id;
          await device.sensors.updateById(sensor.id, updatedSensor);
        }
        // TODO : Define cache TTL with env vars ?
        await SensorResource.setCache(device.id, updatedSensor);
        await Sensor.publish(device, updatedSensor, 'PUT', client);
        return updatedSensor;
      }
      const error = utils.buildError(400, 'INVALID_SENSOR', 'no valid sensor to update');
      throw error;
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
  Sensor.getInstance = async (device, pattern, sensor) => {
    try {
      const SensorResource = Sensor.app.models.SensorResource;
      let instance = SensorResource.getCache(sensor.deviceId, sensor.id);
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
      //  const topic = `${params.appEui}/Sensor/HEAD`;
      return instance;
    } catch (error) {
      return error;
    }
  };

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
   * @returns {functions}
   */
  Sensor.execute = async (device, sensor, method, client) => {
    try {
      logger.publish(4, `${collectionName}`, 'execute:req', method);
      // also  replace sensor when they share same nativeSensorId and nativeNodeId but type has changed ?
      switch (method.toUpperCase()) {
        case 'HEAD':
          await Sensor.handlePresentation(device, sensor, client);
          break;
        case 'GET':
          sensor = await Sensor.getInstance(device, sensor);
          await Sensor.publish(device, sensor, 'POST', client);
          break;
        case 'POST':
          await Sensor.createOrUpdate(device, sensor, sensor.resource, sensor.value, client);
          break;
        case 'PUT':
          await Sensor.createOrUpdate(device, sensor, sensor.resource, sensor.value, client);
          break;
        case 'STREAM':
          //  return Sensor.publish(sensor, method);
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
   * @returns {functions} Sensor.execute
   */
  Sensor.onPublish = async (device, attributes, sensor, client) => {
    try {
      if (!sensor || sensor === null) {
        sensor = await Sensor.compose(
          device,
          attributes,
        );
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
        return Sensor.execute(device, sensor, method, client);
      }
      const error = utils.buildError(400, 'INVALID_SENSOR', 'Error while building sensor instance');
      throw error;
    } catch (error) {
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
    try {
      if (!filter.text) return null;
      // use OMA object description as lexic
      const omaObjects = await Sensor.app.models.OmaObject.find({
        where: {
          or: [
            { name: { like: new RegExp(`.*${filter.text}.*`, 'i') } },
            { id: { like: new RegExp(`.*${filter.text}.*`, 'i') } },
            { description: { like: new RegExp(`.*${filter.text}.*`, 'i') } },
          ],
        },
      });

      const promises = await omaObjects.map(async obj => {
        const whereFilter = {
          and: [{ name: { like: new RegExp(`.*${obj.name}.*`, 'i') } }, { type: obj.id }],
        };
        // if (filter.status !== undefined)
        let sensors = await Sensor.find({
          where: whereFilter,
        });
        if (!sensors || sensors === null) {
          sensors = [];
        }
        sensors = JSON.parse(JSON.stringify(sensors));
        return [...sensors];
      });

      const result = await Promise.all(promises);
      if (!result || result === null) {
        return [];
      }
      const sensors = utils.flatten(result);
      if (filter.limit && typeof filter.limit === 'number' && sensors.length > filter.limit) {
        sensors.splice(filter.limit, sensors.length - 1);
      }
      logger.publish(4, `${collectionName}`, 'search:res', sensors.length);
      return sensors;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'search:err', error);
      throw error;
    }
  };

  /**
   * Event reporting that a device client sent sensors update.
   * @event publish
   * @param {object} message - Parsed MQTT message.
   * @property {object} message.device - found device instancet.
   * @property {object} message.pattern - Pattern detected by Iot-Agent
   * @property {object} message.attributes - IotAgent parsed message
   * @property {object} [message.sensor] - Found sensor instance
   * @property {object} message.client - MQTT client
   * @returns {functions} Sensor.onPublish
   */
  Sensor.on('publish', async message => {
    try {
      if (!message || message === null) throw new Error('Message empty');
      const device = message.device;
      //  const pattern = message.pattern;
      const attributes = message.attributes;
      const client = message.client;
      const sensor = message.sensor;
      if (!device || (!attributes && !sensor)) throw new Error('Message missing properties');
      return Sensor.onPublish(device, attributes, sensor, client);
    } catch (error) {
      return error;
    }
  });

  /**
   * Event reporting that a sensor instance will be created or updated.
   * @event before save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Sensor instance
   * @returns {function} onBeforeSave
   */
  Sensor.observe('before save', onBeforeSave);

  /**
   * Event reporting that a sensor instance has been created or updated.
   * @event after save
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.instance - Sensor instance
   * @returns {function} onAfterSave
   */
  Sensor.observe('after save', onAfterSave);

  /**
   * Event reporting that a/several sensor instance(s) will be deleted.
   * @event before delete
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} ctx.where.id - Sensor id
   * @returns {function} onBeforeDelete
   */
  Sensor.observe('before delete', onBeforeDelete);

  /**
   * Event reporting that a sensor instance / collection is requested
   * @event before find
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @returns {function} onBeforeRemote
   */
  Sensor.beforeRemote('**', onBeforeRemote);

  Sensor.afterRemoteError('*', async ctx => {
    logger.publish(2, `${collectionName}`, `after ${ctx.methodString}:err`, '');
    return ctx;
  });
};
