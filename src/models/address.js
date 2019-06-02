import NodeGeocoder from 'node-geocoder';
import logger from '../services/logger';

const options = {
  provider: 'opencage',
  httpAdapter: 'https', // Default
  apiKey: process.env.OCD_API_KEY,
  formatter: null, // 'gpx', 'string', ...
};

/**
 * @module Address
 */

module.exports = function(Address) {
  const collectionName = 'Address';
  //  const resources = 'Addresses';

  // Address.validatesPresenceOf('city', 'postalCode', {
  //   message: 'must contain city and postalCode value',
  // });

  Address.observe('after save', async ctx => {
    try {
      //  console.log('options', ctx.options);
      //  logger.publish(3, `${collectionName}`, 'afterSave:req', ctx.req);
      if (!ctx.options.accessToken) throw new Error('invalid access to address');
      else if (ctx.instance.city && ctx.instance.street && ctx.instance.postalCode) {
        //  if (Object.prototype.hasOwnProperty.call(ctx.instance, 'deviceId')) {
        if (ctx.instance.deviceId) {
          // const device = await Address.app.models.Device.findById(ctx.instance.deviceId);
          // device.fullAddress = `${ctx.instance.street} ${ctx.instance.postalCode} ${
          //   ctx.instance.city
          // }`;
          // await device.save();
          // logger.publish(3, `${collectionName}`, 'afterSave:res', device);
          return ctx.instance;
        } else if (ctx.instance.userId) {
          const user = await Address.app.models.user.findById(ctx.options.accessToken.userId);
          user.fullAddress = `${ctx.instance.street} ${ctx.instance.postalCode} ${
            ctx.instance.city
          }`;
          await user.save();
          logger.publish(3, `${collectionName}`, 'afterSave:res', user);
          return ctx.instance;
        }
        throw new Error('no address owner found');
      }
      throw new Error('invalid address instance');
    } catch (error) {
      return error;
    }
  });

  Address.verifyAddress = async address => {
    let result = {};
    const geocoder = NodeGeocoder(options);
    await geocoder
      .geocode({
        address: `${address.street} ${address.city}`,
        countryCode: 'fr',
        zipcode: address.postalCode,
      })
      .then(res => {
        result.streetNumber = Number(res[0].streetNumber) || Number(res[1].streetNumber);
        result.streetName = res[0].streetName || res[1].streetName || res[2].streetName;
        result.city = res[0].city || res[1].city || res[2].city;
        result.postalCode = res[0].zipcode || res[1].zipcode || res[2].zipcode;
        result.coordinates = {
          lat: Number(res[0].latitude) || Number(res[1].latitude),
          lng: Number(res[0].longitude) || Number(res[1].longitude),
        };
        result.countryCode = res[0].countryCode;
        result.public = address.public;
        logger.publish(3, `${collectionName}`, 'verifyAddress:res2', result);
        if (!result.city || !result.postalCode) {
          result = {
            message: "Sorry, we couldn't verify this address",
          };
        } else if (!result.streetName) {
          result.street = `${address.street}`;
        } else if (!result.streetNumber) {
          result.street = `${result.streetName}`;
        } else {
          result.street = `${result.streetNumber} ${result.streetName}`;
        }
      })
      .catch(err => err);
    logger.publish(3, `${collectionName}`, 'verifyAddress:res', result);
    return result;
  };
};
