/* Copyright 2020 Edouard Maleix, read LICENSE */

/* eslint-disable no-param-reassign */
import { publish } from 'iot-agent';
import { publishToDeviceApplications } from '../lib/models/device';
import {
  collectionName,
  // checkFilter,
  deleteMeasurements,
  findMeasurements,
  onBeforeRemote,
  typeValidator,
  resourceValidator,
  updateMeasurements,
} from '../lib/models/measurement';
import utils from '../lib/utils';
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
module.exports = function (Measurement) {
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
    const device = await utils.findById(Measurement.app.models.Device, deviceId);
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
  Measurement.compose = (sensor) => {
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

    // const twoHour = 7200000;
    // let timestamp = new Date(sensor.lastSignal);
    // if (new Date(sensor.lastSignal) < new Date() - twoHour) {
    //   // console.log("OUTDATED DATA, let's cheat");
    //   timestamp = new Date();
    // }

    const timestamp = Date.now();

    const measurement = {
      value: sensor.resources[sensor.resource.toString()],
      timestamp,
      type: sensor.type.toString(),
      resource: sensor.resource.toString(),
      nativeNodeId: sensor.nativeNodeId || '0',
      nativeSensorId: sensor.nativeSensorId,
      sensorId: sensor.id.toString(),
      deviceId: sensor.deviceId.toString(),
      ownerId: sensor.ownerId.toString(),
    };

    logger.publish(4, `${collectionName}`, 'compose:res', {
      measurement,
    });
    return measurement;
  };

  Measurement.once('dataSourceAttached', (Model) => {
    /**
     * Create measurement
     * @method module:Measurement.create
     * @param {object} measurement
     * @returns {Promise<object>}
     */

    /**
     * Find measurement by id
     * @method module:Measurement.findById
     * @param {string} id
     * @returns {Promise<object | null>}
     */
    Model.findById = async (id) => findMeasurements(Model.app, { id });

    /**
     * Find measurements
     * @method module:Measurement.find
     * @param {object} filter
     * @returns {Promise<object[] | null>}
     */
    Model.find = async (filter) => {
      if (!filter || filter === null) {
        throw utils.buildError(400, 'INVALID_ARG', 'Missing filter in argument');
      }
      return findMeasurements(Model.app, filter);
    };

    /**
     * Update measurement by id
     * @method module:Measurement.replaceById
     * @param {any} id
     * @param {object} attributes
     * @returns {Promise<object | null>}
     */
    Model.replaceById = async (id, attributes) => {
      const instances = await findMeasurements(Model.app, { id });
      if (!instances || !instances[0]) {
        throw utils.buildError(404, 'MEASUREMENT NOT FOUND', 'Measurement instance not found');
      }
      return updateMeasurements(Model.app, attributes, instances[0]);
    };

    /**
     * Update many Measurement instances
     * @method module:Measurement.replace
     * @param {object} filter - Where filter
     * @param {object} attributes
     * @returns {Promise<object[] | null>}
     */
    Model.replace = async (filter, attributes) => {
      if (!filter || !attributes) {
        throw utils.buildError(400, 'INVALID_ARG', 'Missing filter | attributes in argument');
      }
      const instances = await findMeasurements(Model.app, filter);
      if (!instances || !instances.length) {
        throw utils.buildError(404, 'MEASUREMENT NOT FOUND', 'Measurement instances not found');
      }
      return updateMeasurements(Model.app, attributes, instances);
    };

    /**
     * Delete measurement by id
     * @method module:Measurement.destroyById
     * @param {any} id
     * @returns {Promise<boolean>}
     */
    Model.destroyById = async (id) => deleteMeasurements(Model.app, { id });

    /**
     * Delete measurements
     * @method module:Measurement.delete
     * @param {object} filter
     * @returns {Promise<boolean>}
     */
    Model.delete = async (filter) => {
      if (!filter || filter === null) {
        throw utils.buildError(400, 'INVALID_ARG', 'Missing filter in argument');
      }
      return deleteMeasurements(Model.app, filter);
    };

    /**
     * Delete many Measurement instances
     * @method module:Measurement.destroyAll
     * @param {object} filter - Where filter
     * @returns {Promise<boolean>}
     */
    Model.destroyAll = async (filter) => {
      if (!filter || filter === null) {
        throw utils.buildError(400, 'INVALID_ARG', 'Missing filter in argument');
      }
      logger.publish(4, `${collectionName}`, 'destroyAll:req', { filter });
      return deleteMeasurements(Model.app, filter);
    };
  });

  /**
   * Event reporting that a measurement method is requested
   * @event before_*
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @returns {Promise<function>} Measurement~onBeforeRemote
   */
  Measurement.beforeRemote('**', async (ctx) => onBeforeRemote(Measurement.app, ctx));

  Measurement.afterRemoteError('*', async (ctx) => {
    logger.publish(2, `${collectionName}`, `after ${ctx.methodString}:err`, ctx.error);
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
