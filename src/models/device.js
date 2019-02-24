/* eslint-disable no-param-reassign */
import handlers from "aloes-handlers";
import logger from "../services/logger";
import utils from "../services/utils";

module.exports = function(Device) {
  const collectionName = "Device";

  // async function protocolNameValidator(err) {
  //   const protocolPatternsKeys = Object.getOwnPropertyNames(handlers.protocolPatterns);
  //   if (protocolPatternsKeys.find((key) => key === this.protocolName)) return;
  //   err();
  // }

  async function typeValidator(err) {
    if (
      this.type.toLowerCase() === "gateway" ||
      this.type.toLowerCase() === "node" ||
      this.type.toLowerCase() === "phone" ||
      this.type.toLowerCase() === "camera" ||
      this.type.toLowerCase() === "nodewebcam"
    ) {
      return;
    }
    err();
  }

  // Device.validate("protocolName", protocolNameValidator, {
  //   message: "Wrong device protocol name",
  // });

  Device.validate("type", typeValidator, {
    message: "Wrong device type",
  });

  Device.validatesUniquenessOf("devEui", {scopedTo: ["accountId"]});
  Device.validatesDateOf("lastSignal", {message: "lastSignal is not a date"});

  Device.observe("before save", async (ctx) => {
    logger.publish(3, `${collectionName}`, "beforeSave:req", ctx.instance);
    logger.publish(3, `${collectionName}`, "beforeSave:req", ctx.data);
    try {
      let device;
      if (ctx.data) {
        device = ctx.data;
      } else if (ctx.instance) {
        device = ctx.instance;
      }
      // make a list properties to watch =>
      switch (device.protocolName) {
        case "mySensors":
          device.qrCode = `${device.accessPointUrl}/wifi?server=${process.env.MQTT_BROKER_HOST}&port=${
            process.env.MQTT_BROKER_PORT
          }&client=${device.devEui}&user=${device.id}&password=${device.appKey}`;
          break;
        case "aloesLight":
          device.qrCode = `${device.accessPointUrl}/wifi?server=${process.env.MQTT_BROKER_HOST}&port=${
            process.env.MQTT_BROKER_PORT
          }&client=${device.devEui}&user=${device.id}&password=${device.appKey}`;
          break;
        case "nodeWebcam":
          device.qrCode = `${device.accessPointUrl}/wifi?server=${process.env.MQTT_BROKER_HOST}&port=${
            process.env.MQTT_BROKER_PORT
          }&client=${device.devEui}&user=${device.id}&password=${device.appKey}`;
          break;
        case "tracker":
          device.qrCode = `${process.env.HTTP_SERVER_URL}/tracker?id=${device.id}`;
          break;
        default:
          console.log(device);
      }
      //  logger.publish(3, `${collectionName}`, "beforeSave:res1", device);

      switch (device.type) {
        case "gateway":
          device.icons[0] = `${process.env.HTTP_CLIENT_URL}/icons/aloes/gateway.png`;
          //  device.icons[1] = `${process.env.HTTP_CLIENT_URL}/icons/aloes/gateway-white.png`;
          break;
        case "node":
          device.icons[0] = `${process.env.HTTP_CLIENT_URL}/icons/aloes/node.png`;
          device.icons[1] = `${process.env.HTTP_CLIENT_URL}/icons/aloes/node-white.png`;
          break;
        case "phone":
          device.icons[0] = `${process.env.HTTP_CLIENT_URL}/icons/aloes/phone.png`;
          break;
        case "camera":
          device.icons[0] = `${process.env.HTTP_CLIENT_URL}/icons/aloes/camera.png`;
          break;
        default:
          console.log(device.type);
      }
      logger.publish(5, collectionName, "beforeSave:res", device);
      return device;
    } catch (error) {
      logger.publish(3, `${collectionName}`, "beforeSave:err", error);
      throw error;
    }
  });

  Device.observe("after save", async (ctx) => {
    logger.publish(5, `${collectionName}`, "afterSave:req", ctx.instance);
    try {
      if (ctx.instance && Device.app) {
        let result;
        if (ctx.isNewInstance) {
          const token = await Device.app.models.AccessToken.findOrCreate(
            {
              where: {
                devEui: ctx.instance.devEui,
                userId: ctx.instance.id,
              },
            },
            {
              devEui: ctx.instance.devEui,
              userId: ctx.instance.id,
              ttl: 0,
            },
          );
          logger.publish(2, collectionName, "afterSave:res1", token[0]);
          await ctx.instance.updateAttribute("appKey", token[0].id.toString());
          await ctx.instance.deviceAddress.create({
            street: "",
            streetNumber: null,
            streetName: null,
            postalCode: null,
            city: null,
            public: true,
          });
          result = await handlers.publish({
            userId: ctx.instance.accountId,
            collectionName,
            data: ctx.instance,
            method: "POST",
            pattern: "aloesClient",
          });
          if (result && result.topic && result.payload) {
            return Device.app.publish(result.topic, result.payload);
          }
        }
        //  check if token is still valid ?
        result = await handlers.publish({
          userId: ctx.instance.accountId,
          collectionName,
          data: ctx.instance,
          modelId: ctx.instance.id,
          method: "PUT",
          pattern: "aloesClient",
        });
        if (result && result.topic && result.payload) {
          return Device.app.publish(result.topic, result.payload);
        }
        return null;
      }
      return ctx;
    } catch (error) {
      logger.publish(3, `${collectionName}`, "afterSave:err", error);
      throw error;
    }
  });

  Device.observe("before delete", async (ctx) => {
    //  console.log('before delete ', ctx);
    try {
      const instance = await ctx.Model.findById(ctx.where.id);
      console.log("before delete ", instance);
      await Device.app.models.AccessToken.destroyAll({
        userId: {like: new RegExp(`.*${ctx.where.id}.*`, "i")},
      });
      await Device.app.models.Sensor.destroyAll({
        deviceId: {like: new RegExp(`.*${ctx.where.id}.*`, "i")},
      });
      await Device.app.models.Address.destroyAll({
        deviceId: {like: new RegExp(`.*${ctx.where.id}.*`, "i")},
      });
      if (instance && instance.accountId && Device.app) {
        const result = await handlers.publish({
          userId: instance.accountId,
          collectionName,
          data: instance,
          method: "DELETE",
          pattern: "aloesClient",
        });
        if (result && result.topic && result.payload) {
          return Device.app.publish(result.topic, result.payload);
        }
      }
      return null;
    } catch (error) {
      return error;
    }
  });

  const parseMessage = async (packet, params) => {
    logger.publish(4, `${collectionName}`, "parseMessage:req", params);
    if (params.topic && params.payload) {
      // publish to params.protocolName
      return Device.app.publish(params.topic, params.payload.toString());
    } else if (params.devEui || params.deviceId) {
      //  update device and sensor
      const device = await Device.findOne({
        where: {
          and: [{protocolName: params.protocolName}, {or: [{devEui: params.devEui}, {id: params.deviceId}]}],
        },
      });
      //  console.log("onPublish, device :", device);
      if (!device.id) return null;
      let filter;
      if (params.nativeSensorId && params.nativeType && params.type) {
        filter = {
          where: {
            protocolName: device.protocolName,
            deviceId: device.id,
            devEui: device.devEui,
            nativeSensorId: params.nativeSensorId,
            type: params.type,
            nativeType: params.nativeType,
          },
        };
      } else if (params.nativeSensorId && params.inputPath && params.outputPath) {
        // const inputPath = {like: new RegExp(`.*${params.inputPath}.*`, "i")}
        // const outputPath = {like: new RegExp(`.*${params.outputPath}.*`, "i")}
        filter = {
          where: {
            protocolName: device.protocolName,
            deviceId: device.id,
            devEui: device.devEui,
            nativeSensorId: params.nativeSensorId,
            nativeNodeId: params.nativeNodeId,
            //  mainResourceId: params.mainResourceId,
            inputPath: params.inputPath,
            outputPath: params.outputPath,
          },
        };
      } else {
        console.log("can't compose filter");
        return null;
      }
      let sensor = await Device.app.models.Sensor.findOne(filter);
      //  console.log("found sensor :", sensor);
      if (params.method === "GET") {
        // publish sensor to native route
        return sensor;
      } else if (params.method === "POST" || params.method === "PUT" || params.method === "HEAD") {
        delete params.method;
        delete params.prefix;
        await device.updateAttributes({frameCounter: device.frameCounter + 1, lastSignal: params.lastSignal});
        if ((!sensor || sensor === null) && params.type) {
          sensor = await device.sensors.create({
            ...params,
            accountId: device.accountId,
          });
          return sensor;
        }
        let tempSensor = sensor;

        if (params.value && params.resource) {
          tempSensor = await handlers.updateAloesSensors(tempSensor, Number(params.resource), params.value);
          tempSensor.frameCounter += 1;
        }
        console.log("UPDATE ALOES SENSOR");
        console.log(" sensor value:", tempSensor.value);
        console.log("type of sensor value:", typeof tempSensor.value);

        // await sensor.measurements.create({
        //   date: params.lastSignal,
        //   type: sensor.type,
        //   type: typeof tempSensor.value,
        //   omaObjectId: sensor.type,
        //   omaResourceId: params.resource,
        //   resource: params.resource,
        //   deviceId: device.id,
        //   value: tempSensor.value,
        // });
        return sensor.updateAttributes(tempSensor);
      } else if (params.method === "STREAM") {
        console.log("streaming sensor:");
        const stream = await handlers.publish({
          userId: device.accountId,
          collectionName: "Sensor",
          data: params.value,
          method: "STREAM",
          pattern: "aloesClient",
        });
        return Device.app.publish(stream.topic, stream.payload);
      }
      return params;
    }
    return null;
  };

  Device.onPublish = async (pattern, packet) => {
    try {
      // logger.publish(4, `${collectionName}`, "onPublish:req", pattern);
      let decoded;
      switch (pattern.name) {
        case "mySensors":
          decoded = await handlers.mySensorsDecoder(packet, pattern.params);
          break;
        case "aloesLight":
          decoded = await handlers.aloesLightDecoder(packet, pattern.params);
          break;
        case "aloesClient":
          decoded = await handlers.aloesClientDecoder(packet, pattern.params);
          break;
        default:
          console.log(pattern);
      }
      // check decoded payload
      //  logger.publish(4, `${collectionName}`, "onPublish:req", decoded);
      if (!decoded) return null;
      return parseMessage(packet, decoded);
    } catch (error) {
      return error;
    }
  };

  const findDevice = async (whereFilter) =>
    new Promise((resolve, reject) => {
      Device.app.models.find(whereFilter, (err, profiles) => (err ? reject(err) : resolve(profiles)));
    });

  Device.textSearch = async (ctx, filter) => {
    logger.publish(4, `${collectionName}`, "textSearch:req", filter);
    try {
      //  if (process.env.NODE_ENV.toString() === "development") return null;
      if (!ctx.req.accessToken.userId || (!filter.name && !filter.place)) {
        return null;
      }
      let whereFilter;
      if (filter.place && !filter.name) {
        whereFilter = {
          where: {
            fullAddress: {
              like: new RegExp(`.*${filter.place}.*`, "i"),
            },
          },
        };
      } else if (filter.name && !filter.place) {
        whereFilter = {
          where: {
            name: {
              like: new RegExp(`.*${filter.name}.*`, "i"),
            },
          },
        };
      } else {
        whereFilter = {
          where: {
            or: [
              {
                name: {
                  like: new RegExp(`.*${filter.name}.*`, "i"),
                },
              },
              {
                fullAddress: {
                  like: new RegExp(`.*${filter.place}.*`, "i"),
                },
              },
            ],
          },
        };
      }
      filter.collectionType = collectionName;
      const devices = await findDevice(whereFilter);
      const result = await utils.composeTextSearchResult(ctx.req.accessToken.userId, filter, devices);
      logger.publish(2, `${collectionName}`, "textSearch:res", result);
      return result;
    } catch (error) {
      logger.publish(2, `${collectionName}`, "textSearch:err", error);
      return error;
    }
  };

  const findAddresses = async (filter) =>
    new Promise((resolve, reject) => {
      Device.app.models.Address.find(
        {
          where: {
            public: true,
            coordinates: {
              near: filter.location,
              maxDistance: filter.maxDistance,
              unit: filter.unit,
            },
          },
        },
        (err, addresses) => (err ? reject(err) : resolve(addresses)),
      );
    });

  Device.geoLocate = async (filter) => {
    try {
      logger.publish(4, `${collectionName}`, "geoLocate:req", filter);
      const addresses = await findAddresses(filter);
      //  logger.publish(4, `${collectionName}`, 'geoLocate:res', addresses);
      if (!addresses) {
        const error = new Error("Aucun match");
        return error;
      }
      let deviceAddresses = await addresses.filter((address) => address.deviceId);
      logger.publish(4, `${collectionName}`, "geoLocate:res", deviceAddresses);
      if (deviceAddresses.length > 0) {
        deviceAddresses = await utils.composeGeoLocateResult(collectionName, addresses);
      }
      return deviceAddresses;
    } catch (error) {
      logger.publish(2, `${collectionName}`, "geoLocate:err", error);
      return error;
      //  next(error);
    }
  };

  //  Device.createAuthLink = (account, deviceId, method) => {
  // check that this device is owned by account
  // then get device.appKey
  // if method === "qrcode"
  // generate a url
  // if method === "nfc"
  //
  //  };
};
