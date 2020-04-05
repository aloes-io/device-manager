/* Copyright 2020 Edouard Maleix, read LICENSE */

/* eslint-disable no-param-reassign */
import jugglerUtils from 'loopback-datasource-juggler/lib/utils';
import { publish } from 'iot-agent';
import { omaObjects, omaResources } from 'oma-json';
import isLength from 'validator/lib/isLength';
import { publishToDeviceApplications } from '../lib/models/device';
import logger from '../services/logger';
import utils from '../lib/utils';

const collectionName = 'Measurement';

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
  function typeValidator(err) {
    if (
      !this.type ||
      !isLength(this.type.toString(), { min: 1, max: 4 }) ||
      !omaObjects.some(object => object.value.toString() === this.type)
    ) {
      err();
    }
  }

  function resourceValidator(err) {
    if (
      this.resource === undefined ||
      !isLength(this.resource.toString(), { min: 1, max: 4 }) ||
      !omaResources.some(resource => resource.value.toString() === this.resource)
    ) {
      err();
    }
  }

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
   * Format packet and send it via MQTT broker
   * @method module:Measurement.publish
   * @param {object} deviceId - Device instance id
   * @param {object} measurement - Measurement instance
   * @param {string} [method] - MQTT method
   * @param {object} [client] - MQTT client target
   * @fires Server.publish
   */
  Measurement.publish = async (deviceId, measurement, method) => {
    if (!deviceId) {
      throw utils.buildError(403, 'MISSING_DEVICE_ID', 'No device in arguments');
    }
    const device = await Measurement.app.models.Device.findById(deviceId);
    if (!device) {
      throw utils.buildError(403, 'MISSING_DEVICE', 'No device found');
    }

    const packet = publish({
      userId: device.ownerId,
      collection: collectionName,
      // modelId: measurement.id,
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
      publishToDeviceApplications(Measurement.app, device, packet);
      Measurement.app.emit('publish', packet.topic, packet.payload, false, 0);
      return measurement;
    }
    throw new Error('Invalid MQTT Packet encoding');
  };

  /**
   * On sensor update, if an OMA resource is of float or integer type
   * @method module:Measurement.compose
   * @param {object} sensor - updated Sensor instance
   * @returns {object} measurement
   */
  Measurement.compose = sensor => {
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

    let timestamp = new Date();

    // const twoHour = 7200000;
    // let timestamp = new Date(sensor.lastSignal).getTime();
    // if (new Date(sensor.lastSignal) < new Date() - twoHour) {
    //   console.log("OUTDATED DATA, let's cheat");
    //   timestamp = new Date().getTime();
    // }

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
    logger.publish(3, `${collectionName}`, 'compose:res', {
      measurement,
    });
    return measurement;
  };

  Measurement.once('dataSourceAttached', Model => {
    /**
     * Build influxDB query
     * @method module:Measurement~buildQuery
     * @param {object} filter - Where filter
     * @param {object} [rp] - retention policy
     * @returns {Promise<string>}
     */
    const buildQuery = (filter, rp) =>
      new Promise((resolve, reject) => {
        if (!Model.app || !Model.app.datasources.points) {
          reject(new Error('Invalid point datasource'));
        } else {
          Model.app.datasources.points.connector.buildQuery(
            collectionName,
            filter,
            rp,
            (err, query) => (err ? reject(err) : resolve(query)),
          );
        }
      });

    /**
     * Retrieve retention policies in a where filter for Influx
     * @method module:Measurement~getRetentionPolicies
     * @param {object} filter
     * @returns {string[]}
     */
    const getRetentionPolicies = filter => {
      const retentionPolicies = [];
      const influxConnector = Model.app.datasources.points.connector;
      if (typeof filter.rp === 'object') {
        Object.keys(filter.rp).forEach(keyFilter => {
          if (keyFilter === 'inq') {
            Object.values(filter.rp.inq).forEach(rp => {
              // todo : validate rp
              // eslint-disable-next-line security/detect-object-injection
              if (influxConnector.retentionPolicies[rp]) {
                retentionPolicies.push(rp);
              }
            });
          }
        });
      } else if (typeof filter.rp === 'string') {
        if (influxConnector.retentionPolicies[filter.rp]) {
          retentionPolicies.push(filter.rp);
        }
      }
      logger.publish(5, `${collectionName}`, 'getRetentionPolicies:req', {
        retentionPolicies,
      });
      return retentionPolicies;
    };

    /**
     * Find Measurement instances with optional filter
     * @method module:Measurement~findMeasurements
     * @param {object} [filter] - Where filter
     * @returns {Promise<object[] | null>}
     */
    const findMeasurements = async filter => {
      try {
        const influxConnector = Model.app.datasources.points.connector;
        let retentionPolicies = []; // '0s' || '2h';
        if (filter.where) {
          // console.log('FIND MEASUREMENTS BEFORE', filter.where);

          if (filter.where.and) {
            filter.where.and.forEach((subFilter, index) => {
              Object.keys(subFilter).forEach(key => {
                if (key === 'rp') {
                  retentionPolicies = [...retentionPolicies, ...getRetentionPolicies(subFilter)];
                  filter.where.and.splice(index, 1);
                }
              });
            });
          } else if (filter.where.or) {
            filter.where.or.forEach((subFilter, index) => {
              Object.keys(subFilter).forEach(key => {
                if (key === 'rp') {
                  retentionPolicies = [...retentionPolicies, ...getRetentionPolicies(subFilter)];
                  filter.where.or.splice(index, 1);
                  // delete subFilter[key];
                }
              });
            });
          } else {
            Object.keys(filter.where).forEach(key => {
              if (key === 'rp') {
                retentionPolicies = [...retentionPolicies, ...getRetentionPolicies(filter.where)];
                delete filter.where.rp;
              }
            });
          }
        }
        if (!retentionPolicies || !retentionPolicies.length) {
          retentionPolicies = ['2h']; // '0s';
        }
        logger.publish(4, `${collectionName}`, 'findMeasurements:retentionPolicies', {
          retentionPolicies,
        });

        let result = [];
        await Promise.all(
          retentionPolicies.map(async rp => {
            try {
              const query = await buildQuery(filter, rp);
              //  logger.publish(4, `${collectionName}`, 'findMeasurements:req1', { query });
              const measurements = await influxConnector.client.query(query);
              result = [...result, ...measurements];
              return measurements;
            } catch (error) {
              return null;
            }
          }),
        );

        if (result && result.length) {
          result.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        } else {
          result = [];
        }
        logger.publish(4, `${collectionName}`, 'findMeasurements:res', {
          count: result.length,
        });
        return result;
      } catch (error) {
        logger.publish(2, `${collectionName}`, 'findMeasurements:err', error);
        return null;
        //  throw error;
      }
    };

    /**
     * Find measurement by id
     * @method module:Measurement.findById
     * @param {string} id
     * @param {object} options - Request options
     * @returns {Promise<object | null>}
     */
    Model.findById = (id, options, cb) => {
      try {
        logger.publish(4, `${collectionName}`, 'findById:req', { id });
        cb = cb || jugglerUtils.createPromiseCallback();

        if (!options.accessToken && !options.apikey) {
          cb(utils.buildError(403, 'INVALID_AUTH', 'No token found in HTTP Options'), null);
          return;
        }
        const ownerId = utils.getOwnerId(options);

        if (!ownerId) {
          cb(utils.buildError(401, 'UNAUTHORIZED', 'Invalid user'), null);
          return;
        }
        const filter = { ownerId };
        filter.id = id;
        // const result = await findMeasurements(filter);
        // return result && result.length ? result[0] : null;

        findMeasurements(filter)
          .then(res => cb(null, res ? res[0] : []))
          .catch(err => cb(err, null));
      } catch (error) {
        logger.publish(2, `${collectionName}`, 'findById:err', error);
        cb(error, null);
      }
    };

    /**
     * Find measurements
     * @method module:Measurement.find
     * @param {object} filter
     * @param {object} options - Request options
     * @returns {Promise<object[] | null>}
     */
    Model.find = (filter, options, cb) => {
      try {
        logger.publish(4, `${collectionName}`, 'find:req', { filter });
        cb = cb || jugglerUtils.createPromiseCallback();
        if (!options.accessToken && !options.apikey) {
          cb(utils.buildError(403, 'INVALID_AUTH', 'No token found in HTTP Options'), null);
          return;
        }
        if (!filter || filter === null) {
          cb(utils.buildError(400, 'INVALID_ARG', 'Missing filter in argument'), null);
          return;
        }

        const ownerId = utils.getOwnerId(options);

        if (!ownerId) {
          cb(utils.buildError(401, 'UNAUTHORIZED', 'Invalid user'), null);
          return;
        }
        if (typeof filter === 'string') {
          filter = JSON.parse(filter);
        } else {
          filter = JSON.parse(JSON.stringify(filter));
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

        findMeasurements(filter)
          .then(res => cb(null, res))
          .catch(err => cb(err, null));
      } catch (error) {
        logger.publish(2, `${collectionName}`, 'find:err', error);
        cb(error, null);
      }
    };

    const updateMeasurement = async (attributes, instance) => {
      try {
        const influxConnector = Model.app.datasources.points.connector;
        const query = influxConnector.updatePoint(collectionName, attributes, instance);
        logger.publish(4, `${collectionName}`, 'updateMeasurement:res', { query });
        //  const result = await influxConnector.client.query(query);
        // await Measurement.publish(device, instance, 'PUT');
        return query;
      } catch (error) {
        logger.publish(2, `${collectionName}`, 'updateMeasurement:err', error);
        return null;
      }
    };

    /**
     * Update measurement by id
     * @method module:Measurement.updateById
     * @param {any} id
     * @param {object} filter
     * @returns {Promise<object>}
     */
    Model.replaceById = async (id, data, options) => {
      logger.publish(4, `${collectionName}`, 'replaceById:req', { id });
      if (!options.accessToken || !options.apikey) {
        throw utils.buildError(403, 'INVALID_AUTH', 'No token found in HTTP Options');
      }
      const filter = {};
      if (options.accessToken) {
        filter.ownerId = options.accessToken.userId.toString();
      } else if (options.apiKey && options.appId) {
        const application = await Model.app.models.Application.findById(options.appId);
        filter.ownerId = application.ownerId;
      }
      if (!filter.ownerId) {
        throw utils.buildError(401, 'UNAUTHORZIED', 'Invalid user');
      }
      filter.id = id;
      const instance = await findMeasurements(filter);
      const result = await updateMeasurement(data, instance[0]);
      return result;
    };

    /**
     * Update many Measurement instances
     * @method module:Measurement.destroyAll
     * @param {object} filter - Where filter
     * @param {object} data - Update data
     * @returns {Promise<object[]>}
     */
    Model.updateAll = async (filter, data, options) => {
      logger.publish(4, `${collectionName}`, 'updateAll:req', { filter });
      if (!options.accessToken || !options.apikey) {
        throw utils.buildError(403, 'INVALID_AUTH', 'No token found in HTTP Options');
      }
      if (!filter || filter === null) {
        throw utils.buildError(400, 'INVALID_ARG', 'Missing filter in argument');
      }
      const ownerId = options.accessToken.userId.toString();
      filter.ownerId = ownerId;
      if (filter.where) {
        delete filter.where;
      }
      const instances = await findMeasurements(filter);
      const resPromise = instances.map(async instance => {
        try {
          const measurement = await updateMeasurement(data, instance);
          return measurement;
        } catch (error) {
          return null;
        }
      });
      const result = await Promise.all(resPromise);
      return result;
    };

    const deleteMeasurement = async filter => {
      try {
        let query = `DELETE FROM "${collectionName}" `;
        const influxConnector = Model.app.datasources.points.connector;
        const subQuery = await influxConnector.buildWhere(filter, collectionName);
        query += `${subQuery} ;`;
        logger.publish(4, `${collectionName}`, 'deleteMeasurement:res', { query });
        await influxConnector.client.query(query);
        // const instance = await findMeasurements(filter);
        // await Measurement.publish(device, instance, 'DELETE');
        return true;
      } catch (error) {
        logger.publish(2, `${collectionName}`, 'deleteMeasurement:err', error);
        return null;
      }
    };

    // Model.prototype.delete = function async () {
    //   try {
    //      return Model.deleteById(this.id)
    //   } catch (error) {
    //     return error;
    //   }
    // };

    /**
     * Delete measurement by id
     * @method module:Measuremenr.deleteById
     * @param {any} id
     * @param {object} options
     * @returns {Promise<object>}
     */
    Model.deleteById = async (id, options) => {
      logger.publish(4, `${collectionName}`, 'deleteById:req', { id });
      if (!options.accessToken || !options.apikey) {
        throw utils.buildError(403, 'INVALID_AUTH', 'No token found in HTTP Options');
      }
      const filter = {};
      if (options.accessToken) {
        filter.ownerId = options.accessToken.userId.toString();
      } else if (options.apiKey && options.appId) {
        const application = await Model.app.models.Application.findById(options.appId);
        filter.ownerId = application.ownerId;
      }
      if (!filter.ownerId) throw utils.buildError(401, 'UNAUTHORZIED', 'Invalid user');
      filter.id = id;
      const result = await deleteMeasurement(filter);
      return result;
    };

    /**
     * Delete many Measurement instances
     * @method module:Measurement.destroyAll
     * @param {object} filter - Where filter
     * @returns {Promise<object>}
     */
    Model.destroyAll = async filter => {
      if (!filter || filter === null) {
        throw utils.buildError(400, 'INVALID_ARG', 'Missing filter in argument');
      }
      logger.publish(4, `${collectionName}`, 'destroyAll:req', { filter });
      const result = await deleteMeasurement(filter);
      return result;
    };

    Model.deleteWhere = async (filter, options) => {
      if (!options.accessToken || !options.apikey) {
        throw utils.buildError(403, 'INVALID_AUTH', 'No token found in HTTP Options');
      }
      if (!filter || filter === null) {
        throw utils.buildError(400, 'INVALID_ARG', 'Missing filter in argument');
      }
      logger.publish(4, `${collectionName}`, 'deleteWhere:req', { filter });
      if (options.accessToken) {
        filter.ownerId = options.accessToken.userId.toString();
      } else if (options.apiKey && options.appId) {
        const application = await Model.app.models.Application.findById(options.appId);
        filter.ownerId = application.ownerId;
      }
      if (!filter.ownerId) {
        throw utils.buildError(401, 'UNAUTHORZIED', 'Invalid user');
      }
      if (filter.where) {
        delete filter.where;
      }
      const result = await deleteMeasurement(filter);
      logger.publish(4, `${collectionName}`, 'deleteWhere:res', { result });
      return result;
    };
  });

  /**
   * Create measurement
   * @method module:Measurement.create
   * @param {object} sensor
   * @returns {Promise<object>}
   */

  Measurement.afterRemoteError('*', async ctx => {
    logger.publish(4, `${collectionName}`, `after ${ctx.methodString}:err`, ctx.error);
    // publish on collectionName/ERROR
    return ctx;
  });

  Measurement.disableRemoteMethodByName('exists');
  Measurement.disableRemoteMethodByName('upsert');
  Measurement.disableRemoteMethodByName('replaceOrCreate');
  Measurement.disableRemoteMethodByName('prototype.updateAttributes');
  Measurement.disableRemoteMethodByName('prototype.patchAttributes');
  Measurement.disableRemoteMethodByName('createChangeStream');
};
