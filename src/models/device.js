/* eslint-disable no-param-reassign */
import handlers from "aloes-handlers";
import mqttPattern from "mqtt-pattern";

import logger from "../logger";
import utils from "../utils";

module.exports = function(Device) {
  const collectionName = "Device";

  async function protocolNameValidator(err) {
    const protocolPatternsKeys = Object.getOwnPropertyNames(handlers.protocolPatterns);
    if (protocolPatternsKeys.find((key) => key === this.protocolName)) return;
    err();
  }

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

  Device.validate("protocolName", protocolNameValidator, {
    message: "Wrong device protocol name",
  });

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
      logger.publish(4, collectionName, "beforeSave:res", device);
      return device;
    } catch (error) {
      logger.publish(3, `${collectionName}`, "beforeSave:err", error);
      throw error;
    }
  });

  Device.observe("after save", async (ctx) => {
    logger.publish(3, `${collectionName}`, "afterSave:req", ctx.instance);
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

  Device.onPublish = async (pattern, packet) => {
    try {
      // logger.publish(4, `${collectionName}`, "onPublish:req", pattern);
      let decoded;
      switch (pattern.name) {
        case "mySensors":
          // and publish on virtualObjects where sensorId is referenced
          decoded = await handlers.mySensorsDecoder(packet, pattern.params);
          break;
        case "aloesLight":
          decoded = await handlers.aloesLightDecoder(packet, pattern.params);
          break;
        case "aloesClient":
          decoded = await handlers.aloesClientDecoder(packet, pattern.params);
          break;
        case "nodeWebcam":
          console.log(pattern);
          break;
        case "tracker":
          console.log(pattern);
          break;
        default:
          console.log(pattern);
      }
      // check decoded payload
      logger.publish(4, `${collectionName}`, "onPublish:req", decoded);
      if (!decoded) return null;
      if (decoded.topic) {
        // publish to decoded.protocol
        await Device.app.publish(decoded.topic, decoded.payload.toString());
        return null;
      } else if (decoded.devEui) {
        //  save device and sensor
        const device = await Device.findOne({
          where: {
            devEui: decoded.devEui,
          },
        });
        //  console.log("onPublish, device :", device);
        if (!device.id) return null;
        let filter;
        if (decoded.nativeSensorId && decoded.nativeType && decoded.type) {
          filter = {
            where: {
              protocolName: device.protocolName,
              deviceId: device.id,
              devEui: decoded.devEui,
              nativeSensorId: decoded.nativeSensorId,
              type: decoded.type,
              nativeType: decoded.nativeType,
            },
          };
        } else if (decoded.nativeSensorId && decoded.inputPath && decoded.outputPath) {
          // const inputPath = {like: new RegExp(`.*${decoded.inputPath}.*`, "i")}
          // const outputPath = {like: new RegExp(`.*${decoded.outputPath}.*`, "i")}
          filter = {
            where: {
              protocolName: device.protocolName,
              deviceId: device.id,
              devEui: decoded.devEui,
              nativeSensorId: decoded.nativeSensorId,
              nativeNodeId: decoded.nativeNodeId,
              //  mainResourceId: decoded.mainResourceId,
              inputPath: decoded.inputPath,
              outputPath: decoded.outputPath,
            },
          };
        } else {
          console.log("can't compose filter");
          return null;
        }
        console.log("found filter :", JSON.stringify(filter));
        let sensor = await Device.app.models.Sensor.findOne(filter);
        console.log("found sensor :", sensor);
        if (decoded.method === "GET") {
          return sensor;
        } else if (decoded.method === "POST" || decoded.method === "HEAD") {
          delete decoded.method;
          delete decoded.prefix;
          if ((!sensor || sensor === null) && decoded.type) {
            sensor = await device.sensors.create({
              ...decoded,
              accountId: device.accountId,
            });
            //  await device.updateAttributes({frameCounter: 0, lastSignal: decoded.lastSignal});
          } else {
            await device.updateAttributes({frameCounter: device.frameCounter + 1, lastSignal: decoded.lastSignal});
            let attributes = {
              type: sensor.type,
              resources: sensor.resources,
              ...decoded,
              frameCounter: sensor.frameCounter + 1,
            };
            console.log("updating sensor 1:", attributes);
            if (decoded.value && decoded.resource) {
              const updatedSensor = handlers.updateAloesSensors(attributes, Number(decoded.resource), decoded.value);
              console.log("updating sensor 2:", updatedSensor);
              attributes.resources = {...updatedSensor.resources};
              attributes.value = updatedSensor.value;
            }
            console.log("type of sensor value:", typeof attributes.value);
            if (typeof attributes.value === "object") {
              //  return parseStream(decoded.value, 1024);
            } else if (typeof attributes.value === "string") {
              //  attributes.value = {[decoded.resource]: attributes.value};
            } else if (typeof attributes.value === "number") {
              //  attributes.value = {[decoded.resource]: attributes.value.toString()};
            } else {
              return null;
            }
            // await sensor.measurements.create({
            //   date: decoded.lastSignal,
            //   type: sensor.type,
            //   omaObjectId: sensor.type,
            //   omaResourceId: decoded.resource,
            //   resource: decoded.resource,
            //   deviceId: device.id,
            //   value: updatedSensor.value,
            // });
            console.log("updating sensor with :", attributes);
            sensor = await sensor.updateAttributes(attributes);
          }
          console.log("onPublish, sensor 2:", sensor);
        } else if (decoded.method === "STREAM") {
          console.log("streaming sensor:");
          const stream = await handlers.publish({
            userId: device.accountId,
            collectionName: "Sensor",
            data: packet.payload,
            method: "STREAM",
            pattern: "aloesClient",
          });
          return Device.app.publish(stream.topic, stream.payload);
        }
        return decoded;
      }
      return decoded;
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
