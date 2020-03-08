/* Copyright 2020 Edouard Maleix, read LICENSE */

import NodeGeocoder from 'node-geocoder';
import isAlphanumeric from 'validator/lib/isAlphanumeric';
import isLength from 'validator/lib/isLength';
import logger from '../services/logger';
import utils from '../lib/utils';

const collectionName = 'Address';

const geoCodeOptions = {
  provider: 'opencage',
  httpAdapter: 'https', // Default
  apiKey: process.env.OCD_API_KEY,
  formatter: null, // 'gpx', 'string', ...
};

/**
 * Validate input address; get coordinates and update address instance
 * @method module:Address~onAfterSave
 * @param {object} ctx - Loopback context
 * @returns {Promise<object>} ctx
 */
const onAfterSave = async ctx => {
  logger.publish(4, `${collectionName}`, 'onAfterSave:req', ctx.instance);
  if (ctx.instance.ownerId && ctx.instance.ownerType) {
    const fullAddress = `${ctx.instance.street} ${ctx.instance.postalCode} ${ctx.instance.city}`;
    // if (ctx.instance.ownerType.toLowerCase() === 'user') {
    //   const user = await ctx.Model.app.models.user.findById(ctx.options.accessToken.userId);
    //   await user.updateAttribute({
    //     fullAddress,
    //   });
    // } else if (ctx.instance.ownerType.toLowerCase() === 'device') {
    //   const device = await Address.app.models.Device.findById(ctx.instance.deviceId);
    //   await device.updateAttribute({fullAddress: `${ctx.instance.street} ${ctx.instance.postalCode} ${ctx.instance.city }`});
    // }
    logger.publish(3, `${collectionName}`, 'onAfterSave:res', fullAddress);
    return ctx;
  }
  throw utils.buildError(403, 'INVALID_ACCESS', 'no address owner found');
};

/**
 * Hook executed before every remote methods
 * @method module:Address~onBeforeRemote
 * @param {object} ctx - Loopback context
 * @returns {Promise<object>} ctx
 */
const onBeforeRemote = async ctx => {
  if (ctx.method.name.indexOf('create') !== -1) {
    const options = ctx.args ? ctx.args.options : {};
    //  const data = ctx.args || ctx.args.data;
    if (!options.accessToken) {
      throw utils.buildError(401, 'INVALID_ACCESS', 'token is absent');
    }
    // console.log('authorizedRoles & data', options, data);
  } else if (ctx.method.name === 'search' || ctx.method.name === 'geoLocate') {
    const options = ctx.args ? ctx.args.options : {};
    // console.log('before remote', ctx.method.name, options.currentUser, ctx.args.filter);
    const isAdmin = options.currentUser.roles.includes('admin');
    if (!isAdmin) {
      if (!ctx.args.filter) ctx.args.filter = {};
      ctx.args.filter.ownerId = options.currentUser.id.toString();
      ctx.args.filter.ownerType = options.currentUser.type;
      // ctx.args.filter.public = true;
    }
  }
  return ctx;
};
/**
 * @module Address
 * @property {string} id  Database generated ID
 * @property {string} street
 * @property {string} streetName
 * @property {string} streetNumber
 * @property {number} postalCode
 * @property {string} city
 * @property {object} coordinates
 * @property {boolean} verified
 * @property {boolean} public
 */
module.exports = function(Address) {
  //  const resources = 'Addresses';

  // Address.validatesPresenceOf('city', 'postalCode', {
  //   message: 'must contain city and postalCode value',
  // });
  Address.validatesPresenceOf('ownerId', 'ownerType', {
    message: 'must contain ownerId and ownerType value',
  });

  /**
   * Validate input address; get coordinates and update address instance
   * @async
   * @method module:Address.verifyAddress
   * @param {any} address - Instance address
   * @returns {Promise<object>} address
   */
  Address.verify = async address => {
    logger.publish(4, `${collectionName}`, 'verify:req', address);
    // const requestAddress = { countryCode: 'fr' };
    const requestAddress = {};
    if (address.street && address.city) {
      requestAddress.address = `${address.street} ${address.city}`;
    } else if (!address.street && address.city) {
      requestAddress.address = `${address.city}`;
    } else if (address.street && !address.city) {
      requestAddress.address = `${address.street}`;
    } else if (typeof address === 'string') {
      requestAddress.address = address;
    }
    if (address.postalCode && address.postalCode !== null) {
      requestAddress.zipCode = address.postalCode;
    }
    const geocoder = NodeGeocoder(geoCodeOptions);
    const result = await geocoder.geocode(requestAddress);
    logger.publish(4, `${collectionName}`, 'verify:res', result);

    const verifiedAddress = {};
    if (result && result.length < 1) {
      throw utils.buildError(404, 'ADDRESS_NOT_FOUND', "This address couldn't be verified");
    }
    result.forEach(addr => {
      if (!verifiedAddress.streetNumber && addr.streetNumber) {
        verifiedAddress.streetNumber = Number(addr.streetNumber);
      }
      if (!verifiedAddress.streetName && addr.streetName) {
        verifiedAddress.streetName = addr.streetName;
      }
      if (!verifiedAddress.city && addr.city) {
        verifiedAddress.city = addr.city;
      }
      if (!verifiedAddress.postalCode && addr.zipcode) {
        verifiedAddress.postalCode = Number(addr.zipcode);
      }
      if (!verifiedAddress.coordinates && addr.latitude && addr.longitude) {
        verifiedAddress.coordinates = {
          lat: Number(addr.latitude),
          lng: Number(addr.longitude),
        };
      }
      if (!verifiedAddress.countryCode && addr.countryCode) {
        verifiedAddress.countryCode = addr.countryCode;
      }
      // return verifiedAddress;
    });

    if (!verifiedAddress.city || !verifiedAddress.postalCode) {
      throw utils.buildError(404, 'ADDRESS_NOT_FOUND', "This address couldn't be verified");
    } else if (verifiedAddress.streetName && verifiedAddress.streetNumber) {
      verifiedAddress.street = `${verifiedAddress.streetNumber} ${verifiedAddress.streetName}`;
    } else if (!verifiedAddress.streetNumber && verifiedAddress.streetName) {
      verifiedAddress.street = `${verifiedAddress.streetName}`;
    } else {
      throw utils.buildError(
        422,
        'ADDRESS_NOT_VERIFIED',
        "This address couldn't be fully verified",
      );
    }
    verifiedAddress.public = address.public;
    logger.publish(3, `${collectionName}`, 'verify:res', verifiedAddress);
    return verifiedAddress;
  };

  /**
   * Search address by keyword
   * @async
   * @method module:Address.search
   * @param {object} filter - Requested filter
   * @returns {Promise<array>} addresses
   */
  Address.search = async filter => {
    logger.publish(4, `${collectionName}`, 'search:req', filter);
    if (!filter || !filter.ownerType) {
      throw utils.buildError(400, 'INVALID_REQ', 'Missing argument');
    }
    const whereFilter = {
      and: [{ ownerType: filter.ownerType }],
      // and: [{ public: true }],
    };
    // todo check schema properties to append the right filter type
    if (filter.ownerId) {
      whereFilter.and.push({ ownerId: filter.ownerId });
    }
    if (filter.public !== undefined) {
      whereFilter.and.push({ public: filter.public });
    }
    if (filter.postalCode) {
      whereFilter.and.push({ postalCode: filter.postalCode });
    }
    if (filter.city && isLength(filter.city, { min: 3, max: 35 }) && isAlphanumeric(filter.city)) {
      // eslint-disable-next-line security/detect-non-literal-regexp
      whereFilter.and.push({ city: { like: new RegExp(`.*${filter.city}.*`, 'i') } });
    }
    if (
      filter.street &&
      isLength(filter.street, { min: 5, max: 55 }) &&
      isAlphanumeric(filter.street)
    ) {
      // eslint-disable-next-line security/detect-non-literal-regexp
      whereFilter.and.push({ street: { like: new RegExp(`.*${filter.street}.*`, 'i') } });
    }
    if (
      filter.streetName &&
      isLength(filter.streetName, { min: 5, max: 50 }) &&
      isAlphanumeric(filter.streetName)
    ) {
      whereFilter.and.push({
        // eslint-disable-next-line security/detect-non-literal-regexp
        streetName: { like: new RegExp(`.*${filter.streetName}.*`, 'i') },
      });
    }
    if (filter.streetNumber) {
      whereFilter.and.push({ streetNumber: filter.streetNumber });
    }
    if (filter.postalCode) {
      whereFilter.and.push({ postalCode: filter.postalCode });
    }

    const addresses = await Address.find({ where: whereFilter });
    if (!addresses || addresses === null) {
      throw utils.buildError(404, 'ADDRESSES_NOT_FOUND', 'No match found from filter');
    }
    if (filter.limit && typeof filter.limit === 'number' && addresses.length > filter.limit) {
      addresses.splice(filter.limit, addresses.length - 1);
    }
    logger.publish(4, `${collectionName}`, 'search:res', addresses.length);
    return addresses;
  };

  /**
   * Search addresses by location ( GPS coordinates )
   * @async
   * @method module:Address.geoLocate
   * @param {object} filter - Requested filter
   * @returns {Promise<array>} addresses
   */
  Address.geoLocate = async filter => {
    logger.publish(4, `${collectionName}`, 'geoLocate:req', filter);
    if (!filter || !filter.ownerType) {
      throw utils.buildError(400, 'INVALID_REQ', 'Missing argument');
    }
    const whereFilter = {
      and: [{ ownerType: filter.ownerType }],
    };
    // todo check schema properties to append the right filter type
    if (filter.ownerId) {
      whereFilter.and.push({ ownerId: filter.ownerId });
    }
    if (filter.public !== undefined) {
      whereFilter.and.push({ public: filter.public });
    }
    const coordinatesFilter = {};
    if (filter.location) {
      coordinatesFilter.near = filter.location;
    }
    if (filter.maxDistance) {
      coordinatesFilter.maxDistance = filter.maxDistance;
    }
    if (filter.unit) {
      coordinatesFilter.unit = filter.unit;
    }
    if (coordinatesFilter) {
      whereFilter.and.push({ coordinates: coordinatesFilter });
    }
    // console.log('WHERE FILTER', whereFilter.and);
    const addresses = await Address.find({ where: whereFilter });
    if (!addresses || addresses === null) {
      throw utils.buildError(404, 'ADDRESSES_NOT_FOUND', 'No match found from filter');
    }
    // console.log('ADRESSES', addresses);
    if (filter.limit && typeof filter.limit === 'number' && addresses.length > filter.limit) {
      addresses.splice(filter.limit, addresses.length - 1);
    }
    logger.publish(4, `${collectionName}`, 'geoLocate:res', addresses.length);
    return addresses;
  };

  /**
   * Event reporting that a new user instance has been created.
   * @event create
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} user - User new instance
   * @returns {Promise<function>} onAfterSave
   */
  Address.observe('after save', onAfterSave);

  /**
   * Event reporting that an address instance / collection is requested
   * @event before find
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @returns {Promise<function>} onBeforeRemote
   */
  Address.beforeRemote('**', onBeforeRemote);

  Address.afterRemoteError('*', (ctx, next) => {
    logger.publish(2, `${collectionName}`, `after ${ctx.methodString}:err`, ctx.error);
    next();
  });

  // Address.disableRemoteMethodByName('create');
  Address.disableRemoteMethodByName('count');
  Address.disableRemoteMethodByName('upsertWithWhere');
  Address.disableRemoteMethodByName('replaceOrCreate');
  Address.disableRemoteMethodByName('replaceById');
  Address.disableRemoteMethodByName('updateAttributes');
  Address.disableRemoteMethodByName('patchAttributes');
  Address.disableRemoteMethodByName('createChangeStream');
  Address.disableRemoteMethodByName('deleteById');
  Address.disableRemoteMethodByName('delete');
};
