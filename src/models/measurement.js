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
   * @param {object} device - found Device instance
   * @param {object} measurement - Measurement instance
   * @param {string} [method] - MQTT method
   * @param {object} [client] - MQTT client target
   * returns {function} Measurement.app.publish()
   */
  Measurement.publish = async (device, measurement, method) => {
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
        // if (client && client.id) {
        //   // publish to client
        //   return null;
        // }
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
    const findMeasurements = async filter => {
      try {
        const influxConnector = Model.app.datasources.points.connector;

        let retentionPolicies = []; // '0s' || '2h';
        if (filter.where) {
          if (filter.where.and) {
            filter.where.and.forEach((subFilter, index) => {
              Object.keys(subFilter).forEach(key => {
                if (key === 'rp') {
                  if (typeof subFilter[key] === 'object') {
                    Object.keys(subFilter[key]).forEach(keyFilter => {
                      if (keyFilter === 'inq') {
                        subFilter[key].inq.forEach(rp => {
                          if (influxConnector.retentionPolicies[rp]) {
                            retentionPolicies.push(rp);
                          }
                        });
                      }
                    });
                  } else if (typeof subFilter[key] === 'string') {
                    if (influxConnector.retentionPolicies[subFilter[key]]) {
                      retentionPolicies.push(subFilter[key]);
                    }
                  }
                  filter.where.and.splice(index, 1);
                  // delete subFilter[key];
                }
              });
            });
          } else if (filter.where.or) {
            filter.where.or.forEach((subFilter, index) => {
              Object.keys(subFilter).forEach(key => {
                if (key === 'rp') {
                  if (typeof subFilter[key] === 'object') {
                    Object.keys(subFilter[key]).forEach(keyFilter => {
                      if (keyFilter === 'inq') {
                        subFilter[key].inq.forEach(rp => {
                          if (influxConnector.retentionPolicies[rp]) {
                            retentionPolicies.push(rp);
                          }
                        });
                      }
                    });
                  } else if (typeof subFilter[key] === 'string') {
                    if (influxConnector.retentionPolicies[subFilter[key]]) {
                      retentionPolicies.push(subFilter[key]);
                    }
                  }
                  filter.where.or.splice(index, 1);
                  // delete subFilter[key];
                }
              });
            });
          } else {
            Object.keys(filter.where).forEach(key => {
              if (key === 'rp') {
                if (typeof filter.where.rp === 'object') {
                  Object.keys(filter.where.rp).forEach(keyFilter => {
                    if (keyFilter === 'inq') {
                      filter.where.rp.inq.forEach(rp => {
                        if (influxConnector.retentionPolicies[rp]) {
                          retentionPolicies.push(rp);
                        }
                      });
                    }
                  });
                } else if (typeof filter.where.rp === 'string') {
                  if (influxConnector.retentionPolicies[filter.where.rp]) {
                    retentionPolicies.push(filter.where.rp);
                  }
                }
                delete filter.where.rp;
              }
            });
          }
        }

        if (!retentionPolicies || !retentionPolicies[0]) {
          retentionPolicies = ['2h']; // '0s';
        }
        logger.publish(4, `${collectionName}`, 'findMeasurements:retentionPolicies', {
          retentionPolicies,
        });

        let result = [];
        const promises = await retentionPolicies.map(async rp => {
          try {
            let query;
            influxConnector.buildQuery(collectionName, filter, rp, (err, res) => {
              if (err) throw err;
              query = res;
            });
            //  logger.publish(4, `${collectionName}`, 'findMeasurements:res', { query });
            const measurements = await influxConnector.client.query(query);
            result = [...result, ...measurements];
            return measurements;
          } catch (error) {
            return error;
          }
        });

        await Promise.all(promises);
        result.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        //  console.log('MEASUREMENTS 2 ', result);
        logger.publish(4, `${collectionName}`, 'findMeasurements:res', { result });
        return result;
      } catch (error) {
        return error;
      }
    };

    Model.findById = async (id, options) => {
      try {
        logger.publish(4, `${collectionName}`, 'find:req', { id });
        if (!options.accessToken && !options.apikey) {
          throw new Error('No token found in HTTP Options');
        }
        let ownerId;
        if (options.accessToken) {
          ownerId = options.accessToken.userId.toString();
        } else if (options.apiKey && options.appId) {
          const application = await Model.app.models.Application.findById(options.appId);
          ownerId = application.ownerId;
        }
        if (!ownerId) {
          throw new Error('No ownerId retireved');
        }
        const filter = { ownerId };
        filter.id = id;
        const result = await findMeasurements(filter);
        return result[0];
      } catch (error) {
        return error;
      }
    };

    Model.find = async (filter, options) => {
      try {
        logger.publish(4, `${collectionName}`, 'find:req', { filter });
        //  console.log(`${collectionName}`, 'find:req', options);
        if (!options.accessToken && !options.apikey) {
          throw new Error('No token found in HTTP Options');
        }
        if (!filter || filter === null) throw new Error('Missing filter in argument');
        let ownerId;
        if (options.accessToken) {
          ownerId = options.accessToken.userId.toString();
        } else if (options.apiKey && options.appId) {
          const application = await Model.app.models.Application.findById(options.appId);
          ownerId = application.ownerId;
        }
        if (!ownerId) {
          throw new Error('No ownerId retireved');
        }
        if (filter.where) {
          if (filter.where.and) {
            filter.where.and.push({ ownerId });
          } else {
            filter.where.ownerId = ownerId;
          }
        } else {
          filter.where = { ownerId };
        }
        const result = await findMeasurements(filter);
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
        const filter = {};
        if (options.accessToken) {
          filter.ownerId = options.accessToken.userId.toString();
        } else if (options.apiKey && options.appId) {
          const application = await Model.app.models.Application.findById(options.appId);
          filter.ownerId = application.ownerId;
        }
        if (!filter.ownerId) {
          throw new Error('No ownerId retireved');
        }
        filter.id = id;
        const instance = await findMeasurements(filter);
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
        const instances = await findMeasurements(filter);
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
        const subQuery = await influxConnector.buildWhere(filter, collectionName);
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
        const filter = {};
        if (options.accessToken) {
          filter.ownerId = options.accessToken.userId.toString();
        } else if (options.apiKey && options.appId) {
          const application = await Model.app.models.Application.findById(options.appId);
          filter.ownerId = application.ownerId;
        }
        if (!filter.ownerId) {
          throw new Error('No ownerId retireved');
        }
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
        if (options.accessToken) {
          filter.ownerId = options.accessToken.userId.toString();
        } else if (options.apiKey && options.appId) {
          const application = await Model.app.models.Application.findById(options.appId);
          filter.ownerId = application.ownerId;
        }
        if (!filter.ownerId) {
          throw new Error('No ownerId retireved');
        }
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
