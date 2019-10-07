import NodeGeocoder from 'node-geocoder';
import logger from '../services/logger';
import utils from '../services/utils';

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
 * @returns {object} ctx
 */
const onAfterSave = async ctx => {
  try {
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
    const error = utils.buildError(403, 'INVALID_ACCESS', 'no address owner found');
    throw error;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onAfterSave:err', error);
    throw error;
  }
};

const onBeforeRemote = async ctx => {
  try {
    if (ctx.method.name.indexOf('create') !== -1) {
      const options = ctx.args ? ctx.args.options : {};
      //  const data = ctx.args || ctx.args.data;
      if (!options.accessToken) {
        const error = utils.buildError(401, 'INVALID_ACCESS', 'token is absent');
        throw error;
      }
      // console.log('authorizedRoles & data', options, data);
    } else if (ctx.method.name === 'search' || ctx.method.name === 'geoLocate') {
      const options = ctx.args ? ctx.args.options : {};
      if (!options || !options.currentUser) {
        throw utils.buildError(401, 'UNAUTHORIZED', 'Invalid user request');
      }
      console.log('before remote', ctx.method.name, options.currentUser, ctx.args.filter);
      const isAdmin = options.currentUser.roles.includes('admin');
      if (!isAdmin) {
        if (!ctx.args.filter) ctx.args.filter = {};
        ctx.args.filter.ownerId = options.currentUser.id.toString();
        ctx.args.filter.ownerType = options.currentUser.type;
        // ctx.args.filter.public = true;
      }
    }
    return ctx;
  } catch (error) {
    logger.publish(2, `${collectionName}`, 'onBeforeRemote:err', error);
    throw error;
  }
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
   * @method module:Address.verifyAddress
   * @param {any} address - Instance address
   * @returns {object} address
   */
  Address.verify = async address => {
    try {
      logger.publish(4, `${collectionName}`, 'verify:req', address);
      const requestAddress = { countryCode: 'fr' };
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
      const verifiedAddress = {};
      if (result && result.length < 1) {
        const error = utils.buildError(
          404,
          'ADDRESS_NOT_FOUND',
          "This address couldn't be verified",
        );
        throw error;
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
        return verifiedAddress;
      });

      if (!verifiedAddress.city || !verifiedAddress.postalCode) {
        const error = utils.buildError(
          404,
          'ADDRESS_NOT_FOUND',
          "This address couldn't be verified",
        );
        throw error;
      } else if (verifiedAddress.streetName && verifiedAddress.streetNumber) {
        verifiedAddress.street = `${verifiedAddress.streetNumber} ${verifiedAddress.streetName}`;
      } else if (!verifiedAddress.streetNumber && verifiedAddress.streetName) {
        verifiedAddress.street = `${verifiedAddress.streetName}`;
      } else {
        const error = utils.buildError(
          422,
          'ADDRESS_NOT_VERIFIED',
          "This address couldn't be fully verified",
        );
        throw error;
      }
      verifiedAddress.public = address.public;
      logger.publish(3, `${collectionName}`, 'verify:res', verifiedAddress);
      return verifiedAddress;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'verify:err', error);
      throw error;
    }
  };

  /**
   * Search address by keyword
   * @method module:Address.search
   * @param {object} filter - Requested filter
   * @returns {array} addresses
   */
  Address.search = async filter => {
    logger.publish(4, `${collectionName}`, 'search:req', filter);
    try {
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
      if (filter.city) {
        whereFilter.and.push({ city: { like: new RegExp(`.*${filter.city}.*`, 'i') } });
      }
      if (filter.street) {
        whereFilter.and.push({ street: { like: new RegExp(`.*${filter.street}.*`, 'i') } });
      }
      if (filter.streetName) {
        whereFilter.and.push({
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
        const error = utils.buildError(404, 'ADDRESSES_NOT_FOUND', 'No match found from filter');
        throw error;
      }
      if (filter.limit && typeof filter.limit === 'number' && addresses.length > filter.limit) {
        addresses.splice(filter.limit, addresses.length - 1);
      }
      logger.publish(4, `${collectionName}`, 'search:res', addresses.length);
      return addresses;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'search:err', error);
      throw error;
    }
  };

  /**
   * Search addresses by location ( GPS coordinates )
   * @method module:Address.geoLocate
   * @param {object} filter - Requested filter
   * @returns {array} addresses
   */
  Address.geoLocate = async filter => {
    try {
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
        const error = utils.buildError(404, 'ADDRESSES_NOT_FOUND', 'No match found from filter');
        throw error;
      }
      // console.log('ADRESSES', addresses);
      if (filter.limit && typeof filter.limit === 'number' && addresses.length > filter.limit) {
        addresses.splice(filter.limit, addresses.length - 1);
      }
      logger.publish(4, `${collectionName}`, 'geoLocate:res', addresses.length);
      return addresses;
    } catch (error) {
      logger.publish(2, `${collectionName}`, 'geoLocate:err', error);
      throw error;
    }
  };

  /**
   * Event reporting that a new user instance has been created.
   * @event create
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @param {object} user - User new instance
   * @returns {function} onAfterSave
   */
  Address.observe('after save', onAfterSave);

  /**
   * Event reporting that an address instance / collection is requested
   * @event before find
   * @param {object} ctx - Express context.
   * @param {object} ctx.req - Request
   * @param {object} ctx.res - Response
   * @returns {function} onBeforeRemote
   */
  Address.beforeRemote('**', onBeforeRemote);

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
