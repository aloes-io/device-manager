/* eslint-disable no-param-reassign */
import { publish } from 'iot-agent';
import logger from '../services/logger';

/**
 * @module Measurement
 * @property {String} id  Generated ID.
 * @property {Number} value required.
 * @property {Date} timestamp
 * @property {String} type OMA object ID
 * @property {String} resource OMA resource ID
 * @property {String} ownerId User ID of the developer who registers the application.
 * @property {String} deviceId Device instance Id which has sent this measurement
 * @property {String} sensorId Device instance Id which has generated this measurement
 */
module.exports = function(Measurement) {
  const collectionName = 'Measurement';

  async function typeValidator(err) {
    if (this.type && this.type.toString().length <= 4) {
      if (await Measurement.app.models.OmaObject.exists(this.type)) {
        return;
      }
    }
    err();
  }

  async function resourceValidator(err) {
    if (this.resource && this.resource.toString().length <= 4) {
      if (await Measurement.app.models.OmaResource.exists(this.resource)) {
        return;
      }
    }
    err();
  }

  Measurement.disableRemoteMethodByName('exists');
  Measurement.disableRemoteMethodByName('upsert');
  Measurement.disableRemoteMethodByName('replaceOrCreate');
  //  Measurement.disableRemoteMethodByName('prototype.updateAttributes');
  //  Measurement.disableRemoteMethodByName('prototype.patchAttributes');
  Measurement.disableRemoteMethodByName('createChangeStream');

  Measurement.validatesPresenceOf('sensorId');
  Measurement.validatesPresenceOf('deviceId');
  Measurement.validatesPresenceOf('ownerId');

  Measurement.validate('type', typeValidator, {
    message: 'Wrong measurement type',
  });

  Measurement.validate('resource', resourceValidator, {
    message: 'Wrong measurement resource',
  });

  /**
   * On sensor update, if an OMA resource is of float or integer type
   * @method module:Measurement.compose
   * @param {object} sensor - updated Sensor instance
   * @returns {object} measurement
   */
  Measurement.compose = sensor => {
    try {
      if (
        !sensor ||
        !sensor.id ||
        !sensor.deviceId ||
        !sensor.ownerId ||
        !sensor.resource ||
        !sensor.nativeSensorId ||
        !sensor.resources ||
        !sensor.type
      ) {
        throw new Error('Invalid sensor instance');
      }
      const twoHour = 7200000;
      let timestamp = new Date(sensor.lastSignal).getTime();
      if (new Date(sensor.lastSignal) < new Date() - twoHour) {
        //  console.log("OUTDATED DATA, let's cheat");
        timestamp = new Date().getTime();
      }

      const measurement = {
        value: sensor.resources[sensor.resource.toString()],
        timestamp,
        type: sensor.type.toString(),
        resource: sensor.resource.toString(),
        nativeSensorId: sensor.nativeSensorId,
        sensorId: sensor.id.toString(),
        deviceId: sensor.deviceId.toString(),
        ownerId: sensor.ownerId.toString(),
      };
      if (sensor.nativeNodeId) {
        measurement.nativeNodeId = sensor.nativeNodeId;
      }
      logger.publish(4, `${collectionName}`, 'compose:res', {
        measurement,
      });
      return measurement;
    } catch (error) {
      return error;
    }
  };

  /**
   * Format packet and send it via MQTT broker
   * @method module:Measurement.publish
   * @param {object} device - found device instance
   * @param {object} measurement - Measurement instance
   * @param {string} [method] - MQTT method
   * @param {object} [client] - MQTT client target
   * returns {function} Measurement.app.publish()
   */
  Measurement.publish = async (device, measurement, method, client) => {
    try {
      const packet = await publish({
        userId: measurement.ownerId,
        collection: collectionName,
        modelId: measurement.id,
        data: measurement,
        method: method || 'POST',
        pattern: 'aloesclient',
      });

      if (packet && packet.topic && packet.payload) {
        logger.publish(4, `${collectionName}`, 'publish:res', {
          topic: packet.topic,
        });
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
              await Measurement.app.publish(topic, packet.payload, false, 0);
              return topic;
            } catch (error) {
              return error;
            }
          });
        }
        return Measurement.app.publish(packet.topic, packet.payload, false, 0);
      }
      throw new Error('Invalid MQTT Packet encoding');
    } catch (error) {
      return error;
    }
  };

  Measurement.once('dataSourceAttached', Model => {
    const findMeasurement = async filter => {
      try {
        const rp = 'rp_2h';
        let query;
        const influxConnector = Model.app.datasources.points.connector;
        influxConnector.buildQuery(collectionName, filter, rp, (err, res) => {
          if (err) throw err;
          query = res;
        });
        //  logger.publish(4, `${collectionName}`, 'findMeasurement:res', { query });
        const result = await influxConnector.client.query(query);
        logger.publish(4, `${collectionName}`, 'findMeasurement:res', { result });
        return result;
      } catch (error) {
        return error;
      }
    };

    Model.findById = async (id, options) => {
      try {
        logger.publish(4, `${collectionName}`, 'find:req', { id });
        if (!options.accessToken || !options.apikey) {
          throw new Error('No token found in HTTP Options');
        }
        const ownerId = options.accessToken.userId.toString();
        const filter = { ownerId };
        filter.id = id;
        const result = await findMeasurement(filter);
        return result[0];
      } catch (error) {
        return error;
      }
    };

    Model.find = async (filter, options) => {
      try {
        logger.publish(4, `${collectionName}`, 'find:req', { filter });
        if (!options.accessToken || !options.apikey) {
          throw new Error('No token found in HTTP Options');
        }
        if (!filter || filter === null) throw new Error('Missing filter in argument');
        const ownerId = options.accessToken.userId.toString();
        if (filter.where) {
          if (filter.where.and) {
            filter.where.and.push({ ownerId });
          } else {
            filter.where.ownerId = ownerId;
          }
        } else {
          filter.where = { ownerId };
        }
        const result = await findMeasurement(filter);
        return result;
      } catch (error) {
        logger.publish(2, `${collectionName}`, 'find:err', error);
        return error;
      }
    };

    const updateMeasurement = async (attributes, instance) => {
      try {
        const influxConnector = Model.app.datasources.points.connector;
        const query = influxConnector.updatePoint(collectionName, attributes, instance);
        logger.publish(4, `${collectionName}`, 'updateMeasurement:res', { query });
        //  const result = await influxConnector.client.query(query);
        return query;
      } catch (error) {
        return error;
      }
    };

    Model.replaceById = async (id, data, options) => {
      try {
        logger.publish(4, `${collectionName}`, 'replaceById:req', { id });
        if (!options.accessToken || !options.apikey) {
          throw new Error('No token found in HTTP Options');
        }
        const ownerId = options.accessToken.userId.toString();
        const filter = { ownerId };
        filter.id = id;
        const instance = await findMeasurement(filter);
        const result = await updateMeasurement(data, instance[0]);
        return result;
      } catch (error) {
        logger.publish(2, `${collectionName}`, 'replaceById:err', error);
        return error;
      }
    };

    Model.updateAll = async (filter, data, options) => {
      try {
        logger.publish(4, `${collectionName}`, 'updateAll:req', { filter });
        if (!options.accessToken || !options.apikey) {
          throw new Error('No token found in HTTP Options');
        }
        if (!filter || filter === null) throw new Error('Missing filter in argument');
        const ownerId = options.accessToken.userId.toString();
        filter.ownerId = ownerId;
        if (filter.where) {
          delete filter.where;
        }
        const instances = await findMeasurement(filter);
        const resPromise = await instances.map(async instance => {
          try {
            const measurement = await updateMeasurement(data, instance);
            return measurement;
          } catch (error) {
            return error;
          }
        });
        const result = await Promise.all(resPromise);
        return result;
      } catch (error) {
        logger.publish(2, `${collectionName}`, 'updateAll:err', error);
        return error;
      }
    };

    const deleteMeasurement = async filter => {
      try {
        let query = `DELETE FROM "${collectionName}" `;
        const influxConnector = Model.app.datasources.points.connector;
        const subQuery = influxConnector.buildWhere(filter, collectionName);
        query += `${subQuery} ;`;
        logger.publish(4, `${collectionName}`, 'deleteMeasurement:res', { query });
        const result = await influxConnector.client.query(query);
        return result;
      } catch (error) {
        return error;
      }
    };

    // Model.prototype.delete = function async () {
    //   try {
    //      return Model.deleteById(this.id)
    //   } catch (error) {
    //     return error;
    //   }
    // };

    Model.deleteById = async (id, options) => {
      try {
        logger.publish(4, `${collectionName}`, 'deleteById:req', { id });
        if (!options.accessToken || !options.apikey)
          throw new Error('No token found in HTTP Options');
        const ownerId = options.accessToken.userId.toString();
        const filter = { ownerId };
        filter.id = id;
        const result = await deleteMeasurement(filter);
        return result;
      } catch (error) {
        return error;
      }
    };

    Model.destroyAll = async filter => {
      try {
        if (!filter || filter === null) throw new Error('Missing filter in argument');
        logger.publish(4, `${collectionName}`, 'destroyAll:req', { filter });
        const result = await deleteMeasurement(filter);
        return result;
      } catch (error) {
        return error;
      }
    };

    Model.deleteWhere = async (filter, options) => {
      try {
        if (!options.accessToken || !options.apikey)
          throw new Error('No token found in HTTP Options');
        if (!filter || filter === null) throw new Error('Missing filter in argument');
        logger.publish(4, `${collectionName}`, 'deleteWhere:req', { filter });
        const ownerId = options.accessToken.userId.toString();
        filter.ownerId = ownerId;
        if (filter.where) {
          delete filter.where;
        }
        const result = await deleteMeasurement(filter);
        logger.publish(4, `${collectionName}`, 'deleteWhere:res', { result });
        return result;
      } catch (error) {
        logger.publish(2, `${collectionName}`, 'deleteWhere:err', error);
        return error;
      }
    };
  });

  Measurement.beforeRemote('**', (ctx, unused, next) => {
    //  console.log('beofre getState', ctx.args);
    if (!ctx.req.headers.apikey) return next();
    if (ctx.req.headers.apikey) ctx.args.options.apikey = ctx.req.headers.apikey;
    if (ctx.req.headers.appId) ctx.args.options.appId = ctx.req.headers.appId;
    return next();
  });

  Measurement.afterRemoteError('*', async ctx => {
    try {
      logger.publish(4, `${collectionName}`, `after ${ctx.methodString}:err`, '');
      // publish on collectionName/ERROR
      return ctx;
    } catch (error) {
      return error;
    }
  });
};
