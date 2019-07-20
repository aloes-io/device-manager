import iotAgent from 'iot-agent';
import { updateAloesSensors } from 'aloes-handlers';
import logger from '../services/logger';

/**
 * @module Sensor
 * @property {String} id  Database generated ID.
 * @property {String} name required.
 * @property {String} devEui hardware generated Device Id required.
 * @property {Date} lastSignal
 * @property {Date} lastSync last date when this sensor cache was synced
 * @property {Number} frameCounter Number of messages since last connection
 * @property {String} type OMA object ID, used to format resources schema
 * @property {String} resource OMA resource ID used for last message
 * @property {Array} resources OMA Resources ( formatted object where sensor value and settings are stored )
 * @property {Array} icons OMA Object icons URL
 * @property {Object} colors OMA Resource colors
 * @property {String} transportProtocol Framework used for message transportation
 * @property {String} transportProtocolVersion Framework version
 * @property {String} messageProtocol Framework used for message encoding
 * @property {String} messageProtocolVersion Framework version
 * @property {String} nativeSensorId Original sensor id ( stringified integer )
 * @property {String} [nativeNodeId] Original node id ( stringified integer )
 * @property {String} nativeType Original sensor type identifier
 * @property {String} nativeResource Original sensor variables identifier
 * @property {String} ownerId User ID of the developer who registers the application.
 * @property {String} deviceId Device instance Id which has sent this measurement
 */
module.exports = function(Sensor) {
  const collectionName = 'Sensor';
  const filteredProperties = ['children', 'size', 'show', 'group', 'success', 'error'];

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

  Sensor.disableRemoteMethodByName('count');
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
   * returns {function} Sensor.app.publish()
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
        pattern: 'aloesClient',
      });
      if (packet && packet.topic && packet.payload) {
        logger.publish(4, `${collectionName}`, 'publish:res', {
          topic: packet.topic,
        });
        // const pattern = await iotAgent.patternDetector(packet);
        // //  console.log('pattern :', pattern);
        // let nativePacket = { topic: packet.topic, payload: JSON.stringify(sensor) };
        // nativePacket = await iotAgent.decode(nativePacket, pattern.params);
        // if (nativePacket.payload && nativePacket.payload !== null) {
        //   //     await Sensor.app.publish(nativePacket.topic, nativePacket.payload, false, 1);
        // }
        // console.log('sensor nativePacket (not published)', nativePacket.topic);
        if (client && client.id) {
          // publish to client
          return null;
        }
        if (device.appIds && device.appIds.length > 0) {
          await device.appIds.map(async appId => {
            try {
              const parts = packet.topic.split('/');
              parts[0] = appId;
              const topic = parts.join('/');
              await Sensor.app.publish(topic, packet.payload, false, 0);
              return topic;
            } catch (error) {
              return error;
            }
          });
        }
        return Sensor.app.publish(packet.topic, packet.payload, true, 1);
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
      // const keys = Object.keys(attributes)
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
        logger.publish(5, `${collectionName}`, 'compose:create', {
          sensor,
        });
        let newSensor = await device.sensors.create(sensor);
        newSensor = JSON.parse(JSON.stringify(newSensor));
        return newSensor;
      } else if (device.sensors()[0] && device.sensors()[0].id) {
        sensor = device.sensors()[0];
        sensor = JSON.parse(JSON.stringify(sensor));
        sensor.isNewInstance = false;
        sensor.name = attributes.name;
        sensor.type = attributes.type;
        sensor.method = attributes.method;
        sensor.resource = Number(attributes.resource);
        sensor.value = attributes.value;
        sensor.lastSignal = attributes.lastSignal;
        sensor.description = attributes.description;
        sensor.inPrefix = attributes.inPrefix || null;
        sensor.outPrefix = attributes.outPrefix || null;
        sensor.inputPath = attributes.inputPath || null;
        sensor.outputPath = attributes.outputPath || null;
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
      return error;
    }
  };

  /**
   * When HEAD detected, validate sensor.resource and value, then save sensor instance
   * @method module:Sensor.handlePresentation
   * @param {object} device - found device instance
   * @param {object} sensor - Incoming sensor instance
   * @returns {function} sensor.create
   * @returns {function} sensor.updateAttributes
   */
  Sensor.handlePresentation = async (device, sensor) => {
    try {
      logger.publish(4, `${collectionName}`, 'handlePresentation:req', {
        deviceId: device.id,
      });
      const SensorResource = Sensor.app.models.SensorResource;

      if (sensor.isNewInstance && sensor.icons) {
        sensor.method = 'HEAD';
        await SensorResource.setCache(device.id, sensor);
        return Sensor.publish(device, sensor, 'HEAD');
      } else if (!sensor.isNewInstance && sensor.id) {
        let updatedSensor = await SensorResource.getCache(device.id, sensor.id);
        if (!updatedSensor) throw new Error('Sensor not found');
        updatedSensor = { ...updatedSensor, ...sensor };
        updatedSensor.method = 'HEAD';
        updatedSensor.frameCounter = 0;
        await SensorResource.setCache(device.id, updatedSensor);
        return Sensor.publish(device, updatedSensor, 'HEAD');
      }
      throw new Error('no valid sensor to register');
    } catch (error) {
      return error;
    }
  };

  /**
   * Define the way to persist data based on OMA resource type
   * @method module:Sensor~persistMethod
   * @param {number} resource - OMA resource ID
   * @param {string} type - OMA resource type
   * returns {string} method
   */
  const persistMethod = (resource, type) => {
    try {
      // savingProcess = "measurement" || "buffer" || "log"
      logger.publish(5, `${collectionName}`, 'persistMethod:req', {
        type,
      });
      let saveMethod;
      switch (type.toLowerCase()) {
        case 'string':
          saveMethod = 'log';
          break;
        case 'integer':
          switch (resource) {
            case 5526:
              // scheduler mode
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
      }
      logger.publish(4, `${collectionName}`, 'persistMethod:res', {
        method: saveMethod,
      });
      return saveMethod;
    } catch (error) {
      return error;
    }
  };

  /**
   * Persist data based on OMA resource type
   *
   * use influxdb for integers and floats
   *
   * use filestorage for strings and buffers
   *
   * @method module:Sensor~persistResource
   * @param {object} device - Device instance
   * @param {object} sensor - Sensor instance
   * returns {object} result - saved value
   */
  const persistResource = async (device, sensor) => {
    try {
      logger.publish(4, `${collectionName}`, 'persistResource:res', {
        resource: sensor.resource,
      });
      const resourceModel = await Sensor.app.models.OmaResource.findById(sensor.resource);
      const method = await persistMethod(resourceModel.id, resourceModel.type);
      let result;
      if (!method || method === null) throw new Error('Invalid saving method');
      if (method === 'measurement') {
        const Measurement = Sensor.app.models.Measurement;
        const measurement = await Measurement.compose(sensor);
        if (measurement && measurement !== null) {
          const point = await Measurement.create(measurement);
          //  console.log('influx measurement : ', point.id);
          // todo fix id generation error
          await Measurement.publish(device, point.id, 'POST');
          result = point;
        }
      } else if (method === 'log') {
        // in the future add to elastic search db
        // todo save ( append ) resource in log file ( in device container ) then use utils.liner to access it later
      } else if (method === 'buffer') {
        const Files = Sensor.app.models.Files;
        const buffer = await Files.compose(sensor);
        const fileMeta = await Files.uploadBuffer(
          buffer,
          sensor.ownerId.toString(),
          `${sensor.deviceId.toString()}-${sensor.id.toString()}`,
        );
        result = fileMeta;
      }
      return result;
    } catch (error) {
      logger.publish(3, `${collectionName}`, 'persist:err', error);
      return error;
    }
  };

  /**
   * When POST or PUT method detected, validate sensor.resource and value, then save sensor instance
   * @method module:Sensor.createOrUpdate
   * @param {object} device - found Device instance
   * @param {object} sensor - Incoming Densor instance
   * @param {number} resourceKey - Sensor resource name ( OMA )
   * @param {object} resourceValue - Sensor resource value to save
   * @returns {function} sensor.publish
   */
  Sensor.createOrUpdate = async (device, sensor, resourceKey, resourceValue) => {
    try {
      logger.publish(4, `${collectionName}`, 'createOrUpdate:req', {
        sensorId: sensor.id,
        resourceKey,
      });
      if (sensor.isNewInstance) throw new Error('Sensor not created yet');
      const SensorResource = Sensor.app.models.SensorResource;

      if (sensor.id) {
        let updatedSensor = await SensorResource.getCache(sensor.deviceId, sensor.id);
        if (!updatedSensor) throw new Error('Sensor not found');
        updatedSensor = { ...updatedSensor, ...sensor };
        if (resourceValue && resourceKey) {
          updatedSensor = await updateAloesSensors(
            updatedSensor,
            Number(resourceKey),
            resourceValue,
          );
          await persistResource(device, updatedSensor);
        }

        logger.publish(5, `${collectionName}`, 'createOrUpdate:res', {
          inType: typeof resourceValue,
          outType: typeof updatedSensor.value,
        });

        updatedSensor.frameCounter += 1;
        //  if (typeof updatedSensor.lastSignal === "string")
        const lastSignal = new Date(updatedSensor.lastSignal).getTime();
        if (!updatedSensor.lastSync) {
          updatedSensor.lastSync = lastSignal;
        }
        // TODO : Define cache TTL with env vars
        if (updatedSensor.frameCounter % 25 === 0) {
          updatedSensor.lastSync = lastSignal;
          delete updatedSensor.id;
          updatedSensor = await device.sensors.updateById(sensor.id, updatedSensor);
        } else if (lastSignal > updatedSensor.lastSync + 30 * 1000) {
          updatedSensor.lastSync = lastSignal;
          delete updatedSensor.id;
          updatedSensor = await device.sensors.updateById(sensor.id, updatedSensor);
        } else {
          await SensorResource.setCache(device.id, updatedSensor);
        }
        return Sensor.publish(device, updatedSensor, 'PUT');
      }
      throw new Error('no valid sensor to update');
    } catch (error) {
      return error;
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
   * Buildsimple where filter based on given attributes
   * @param {object} pattern - IotAgent detected pattern
   * @param {object} sensor - Incoming sensor instance
   * @returns {function} Sensor.publish
   */
  Sensor.buildWhere = attributes => {
    try {
      const filter = { where: {} };
      // check validAttributes
      const schema = Sensor.definition.properties;
      const schemaKeys = Object.keys(schema);
      const attributesKeys = Object.keys(attributes);
      if (attributesKeys.length > 1) {
        filter.where = { and: [] };
        attributesKeys.forEach(key =>
          schemaKeys.forEach(schemaKey => {
            if (schemaKey === key && attributes[key] !== null) {
              filter.where.and.push({
                [key]: attributes[key],
              });
            }
          }),
        );
      } else {
        schemaKeys.forEach(schemaKey => {
          if (schemaKey === attributesKeys[0] && attributes[attributesKeys[0]] !== null) {
            filter.where = {
              [attributesKeys[0]]: attributes[attributesKeys[0]],
            };
          }
        });
      }
      console.log('filter : ', filter);
      return filter;
    } catch (error) {
      return error;
    }
  };

  /**
   * When sensor found, execute method extracted from MQTT topic
   * @param {object} device - Found device client
   * @param {object} sensor - Parsed external app message
   * @param {string} method - method from MQTT topic
   * @param {object} [client] - MQTT client target
   * @returns {functions}
   */
  Sensor.execute = async (device, sensor, method, client) => {
    try {
      logger.publish(4, `${collectionName}`, 'execute:req', method);
      // also  replace sensor when they share same nativeSensorId and nativeNodeId but type has changed ?
      switch (method.toUpperCase()) {
        case 'HEAD':
          await Sensor.handlePresentation(device, sensor);
          break;
        case 'GET':
          sensor = await Sensor.getInstance(device, sensor);
          await Sensor.publish(device, sensor, 'GET', client);
          break;
        case 'POST':
          await Sensor.createOrUpdate(device, sensor, sensor.resource, sensor.value);
          break;
        case 'PUT':
          await Sensor.createOrUpdate(device, sensor, sensor.resource, sensor.value);
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
      return error;
    }
  };

  /**
   * Event reporting that a device client sent sensors update.
   * @event publish
   * @param {object} message - Parsed MQTT message.
   * @property {object} message.device - found device instancet.
   * @property {object} message.pattern - Pattern detected by Iot-Agent
   * @property {object} message.attributes - IotAgent parsed message
   */
  Sensor.on('publish', async message => {
    try {
      if (!message || message === null) throw new Error('Message empty');
      const device = message.device;
      // const pattern = message.pattern;
      const attributes = message.attributes;
      let sensor = message.sensor;
      if (!device || (!attributes && !sensor)) throw new Error('Message missing properties');
      if (!sensor || sensor === null) {
        sensor = await Sensor.compose(
          device,
          attributes,
        );
      }
      if (sensor && sensor !== null) {
        let method = 'PUT';
        if (sensor.id) {
          method = 'PUT';
        } else {
          method = 'HEAD';
        }
        return Sensor.execute(device, sensor, method);
      }
      throw new Error('Erro while building sensor instance');
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

  // Sensor.on('changed', async instance => {
  //   try {
  //     console.log(instance); // => the changed model
  //     return instance;
  //   } catch (error) {
  //     return error;
  //   }
  // });

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
        const SensorResource = Sensor.app.models.SensorResource;
        // not working ?
        //  await Sensor.delete(instance.deviceId, instance.id);
        await SensorResource.expireCache(instance.deviceId, instance.id, 1);
        await Sensor.publish(instance, 'DELETE');
        return ctx;
      }
      throw new Error('no instance to delete');
    } catch (error) {
      return error;
    }
  });

  Sensor.afterRemoteError('*', async ctx => {
    try {
      logger.publish(4, `${collectionName}`, `after ${ctx.methodString}:err`, '');
      // publish on collectionName/ERROR
      return ctx;
    } catch (error) {
      return error;
    }
  });
  // future methods
  // Sensor.cleanResources
};
