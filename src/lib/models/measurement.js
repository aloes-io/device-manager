/* Copyright 2020 Edouard Maleix, read LICENSE */

/* eslint-disable no-param-reassign */
import { omaObjects, omaResources } from 'oma-json';
import isLength from 'validator/lib/isLength';
import utils from '../utils';
import logger from '../../services/logger';

export const collectionName = 'Measurement';

export function typeValidator(err) {
  if (
    !this.type ||
    !isLength(this.type.toString(), { min: 1, max: 4 }) ||
    !omaObjects.some((object) => object.value.toString() === this.type)
  ) {
    err();
  }
}

export function resourceValidator(err) {
  if (
    this.resource === undefined ||
    !isLength(this.resource.toString(), { min: 1, max: 4 }) ||
    !omaResources.some((resource) => resource.value.toString() === this.resource)
  ) {
    err();
  }
}

const getConnector = (app) =>
  app && app.datasources && app.datasources.points && app.datasources.points.connector;

/**
 * Build influxDB query
 * @method module:Measurement~buildQuery
 * @param {object} app - Loopback app
 * @param {object} filter - Where filter
 * @param {object} [rp] - retention policy
 * @returns {Promise<string>}
 */
const buildQuery = (app, filter, rp) =>
  new Promise((resolve, reject) => {
    const influxConnector = getConnector(app);
    if (!influxConnector) {
      reject(new Error('Invalid point datasource'));
    } else {
      influxConnector.buildQuery(collectionName, filter, rp, (err, query) =>
        err ? reject(err) : resolve(query),
      );
    }
  });

/**
 * Build influxDB query
 * @method module:Measurement~updatePoint
 * @param {object} app - Loopback app
 * @param {object} attributes
 * @param {object} instance
 * @returns {Promise<array>}
 */
const updatePoint = (app, attributes, instance) =>
  new Promise((resolve, reject) => {
    const influxConnector = getConnector(app);
    if (!influxConnector) {
      reject(new Error('Invalid point datasource'));
    } else {
      influxConnector.updatePoint(collectionName, attributes, instance, (err, res) =>
        err ? reject(err) : resolve(res),
      );
      // return influxConnector.client.query(query);
    }
  });

/**
 * Retrieve retention policies in a where filter for Influx
 * @method module:Measurement~getRetentionPolicies
 * @param {object} app - Loopback application
 * @param {object} filter
 * @returns {string[]}
 */
const getRetentionPolicies = (app, filter) => {
  const retentionPolicies = [];
  const influxConnector = getConnector(app);
  if (!influxConnector) {
    return retentionPolicies;
  }
  if (typeof filter.rp === 'object') {
    Object.keys(filter.rp).forEach((keyFilter) => {
      if (keyFilter === 'inq') {
        Object.values(filter.rp.inq).forEach((rp) => {
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
  logger.publish(4, `${collectionName}`, 'getRetentionPolicies:res', {
    retentionPolicies,
  });
  return retentionPolicies;
};

export const checkFilter = (filter, ownerId) => {
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
  return filter;
};

/**
 * Find Measurement instances with filter
 * @method module:Measurement~findMeasurements
 * @param {object} app - Loopback app
 * @param {object} filter - Where filter
 * @returns {Promise<object[] | null>}
 */
export const findMeasurements = async (app, filter) => {
  logger.publish(4, `${collectionName}`, 'findMeasurements:req', { filter });
  try {
    const influxConnector = getConnector(app);
    if (!influxConnector) {
      throw utils.buildError(500, 'SERVER_ERROR', 'Measuremenent API unavailable');
    }
    let retentionPolicies = []; // '0s' || '2h';

    if (filter.where) {
      if (filter.where.and) {
        filter.where.and.forEach((subFilter, index) => {
          Object.keys(subFilter).forEach((key) => {
            if (key === 'rp') {
              retentionPolicies = [...retentionPolicies, ...getRetentionPolicies(app, subFilter)];
              filter.where.and.splice(index, 1);
            }
          });
        });
      } else if (filter.where.or) {
        filter.where.or.forEach((subFilter, index) => {
          Object.keys(subFilter).forEach((key) => {
            if (key === 'rp') {
              retentionPolicies = [...retentionPolicies, ...getRetentionPolicies(app, subFilter)];
              filter.where.or.splice(index, 1);
              // delete subFilter[key];
            }
          });
        });
      } else {
        Object.keys(filter.where).forEach((key) => {
          if (key === 'rp') {
            retentionPolicies = [...retentionPolicies, ...getRetentionPolicies(app, filter.where)];
            delete filter.where.rp;
          }
        });
      }
    }

    if (!retentionPolicies || !retentionPolicies.length) {
      // retentionPolicies = ['2h']; // '0s';
      retentionPolicies = influxConnector.retentionPolicies
        ? Object.keys(influxConnector.retentionPolicies)
        : ['2h']; // '0s';
    }

    let result = [];
    await Promise.all(
      retentionPolicies.map(async (rp) => {
        try {
          const query = await buildQuery(app, filter, rp);
          logger.publish(4, `${collectionName}`, 'findMeasurements:query', { query });
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
    logger.publish(3, `${collectionName}`, 'findMeasurements:res', {
      count: result.length,
    });
    return result;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'findMeasurements:err', error);
    return null;
  }
};

/**
 * Update Measurement instances with filter
 * @method module:Measurement~updateMeasurements
 * @param {object} app - Loopback app
 * @param {object} attributes - Measurement attributes
 * @param {object | object[]} instances
 * @returns {Promise<object[] | null>}
 */
export const updateMeasurements = async (app, attributes, instances) => {
  try {
    // const influxConnector = getConnector(app);
    let result;
    logger.publish(2, `${collectionName}`, 'updateMeasurements:req', { attributes, instances });
    if (Array.isArray(instances)) {
      result = await Promise.all(
        instances.map(async (instance) => updatePoint(app, attributes, instance)),
      );
    } else {
      result = await updatePoint(app, attributes, instances);
    }
    // await Measurement.publish(instance.deviceId, instance, 'PUT');
    logger.publish(4, `${collectionName}`, 'updateMeasurement:res', result);
    return result;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'updateMeasurement:err', error);
    return null;
  }
};

/**
 * Delete Measurement instances with filter
 * @method module:Measurement~deleteMeasurements
 * @param {object} app - Loopback app
 * @param {object} filter - Where filter
 * @returns {Promise<boolean>}
 */
export const deleteMeasurements = async (app, filter) => {
  logger.publish(4, `${collectionName}`, 'deleteMeasurement:req', { filter });
  try {
    let query = `DELETE FROM "${collectionName}" `;
    const influxConnector = getConnector(app);
    const subQuery = await influxConnector.buildWhere(filter, collectionName);
    query += `WHERE ${subQuery} ;`;
    // logger.publish(3, `${collectionName}`, 'deleteMeasurement:res', { subQuery, query });
    await influxConnector.client.query(query);
    return true;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'deleteMeasurement:err', error);
    return false;
  }
};

/**
 * Called when a remote method tries to access Measurement Model / instance
 * @method module:Measurement~onBeforeRemote
 * @param {object} app - Loopback App
 * @param {object} ctx - Express context
 * @param {object} ctx.req - Request
 * @param {object} ctx.res - Response
 * @returns {Promise<object>} context
 */
export const onBeforeRemote = async (app, ctx) => {
  // console.log('Measurement onBeforeRemote', ctx.method.name);
  if (
    ctx.method.name.indexOf('find') !== -1 ||
    ctx.method.name.indexOf('get') !== -1 ||
    ctx.method.name.indexOf('replace') !== -1 ||
    ctx.method.name.indexOf('delete') !== -1
  ) {
    const options = ctx.options || {};
    const isAdmin = options.currentUser.roles.includes('admin');
    const ownerId = utils.getOwnerId(options);
    if (ctx.req.query && ctx.req.query.filter && !isAdmin) {
      ctx.req.query.filter = checkFilter(ctx.req.query.filter, ownerId);
      // if (typeof ctx.req.query.filter === 'string') {
      //   ctx.req.query.filter = JSON.parse(ctx.req.query.filter);
      // }
      // if (!ctx.req.query.filter.where) ctx.req.query.filter.where = {};
      // ctx.req.query.filter.where.ownerId = ownerId;
    }
  }

  return ctx;
};
