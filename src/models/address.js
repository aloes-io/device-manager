import NodeGeocoder from "node-geocoder";
import logger from "../services/logger";

const options = {
  provider: "opencage",
  httpAdapter: "https", // Default
  apiKey: process.env.OCD_API_KEY,
  formatter: null, // 'gpx', 'string', ...
};

module.exports = function(Address) {
  const collectionName = "Address";
  //  const resources = 'Addresses';

  // Address.validatesPresenceOf('city', 'postalCode', {
  //   message: 'must contain city and postalCode value',
  // });

  Address.observe("after save", async (ctx) => {
    console.log("options", ctx.options);
    //  logger.publish(3, `${collectionName}`, 'afterSave:req', ctx.req);
    if (!ctx.options.accessToken) return null;
    else if (ctx.instance.city && ctx.instance.street && ctx.instance.postalCode) {
      if (Object.prototype.hasOwnProperty.call(ctx.instance, "deviceId")) {
        const device = await Address.app.models.Device.findById(ctx.instance.deviceId);
        device.fullAddress = `${ctx.instance.street} ${ctx.instance.postalCode} ${ctx.instance.city}`;
        await device.save();
        logger.publish(3, `${collectionName}`, "afterSave:res", device);
        return ctx.instance;
      }
      const account = await Address.app.models.Account.findById(ctx.options.accessToken.userId);
      account.fullAddress = `${ctx.instance.street} ${ctx.instance.postalCode} ${ctx.instance.city}`;
      await account.save();
      logger.publish(3, `${collectionName}`, "afterSave:res", account);
      return ctx.instance;
    }
    return null;
  });

  Address.verifyAddress = async (address) => {
    let result = {};
    const geocoder = NodeGeocoder(options);
    await geocoder
      .geocode({
        address: `${address.street} ${address.city}`,
        countryCode: "fr",
        zipcode: address.postalCode,
      })
      .then((res) => {
        result.streetNumber = Number(res[0].streetNumber) || Number(res[1].streetNumber) || Number(res[2].streetNumber);
        result.streetName = res[0].streetName || res[1].streetName || res[2].streetName || res[3].streetName;
        result.city = res[0].city || res[1].city || res[2].city || res[3].city;
        result.postalCode = res[0].zipcode || res[1].zipcode || res[2].zipcode;
        result.coordinates = {
          lat: Number(res[0].latitude) || Number(res[1].latitude),
          lng: Number(res[0].longitude) || Number(res[1].longitude),
        };
        result.countryCode = res[0].countryCode;
        result.public = address.public;
        if (!result.streetName || !result.streetNumber || !result.city || !result.postalCode) {
          result = {
            message: "Oups! L'addresse semble incorrecte, veuillez réessayer",
          };
        } else {
          result.street = `${result.streetNumber}  ${result.streetName}`;
        }
      })
      .catch((err) => err);
    logger.publish(3, `${collectionName}`, "verifyAddress:res", result);
    return result;
  };
};
