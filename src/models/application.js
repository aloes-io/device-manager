//  import handlers from "aloes-handlers";
import logger from "../services/logger";
import externalApps from "../initial-data/external-apps.json";

module.exports = (Application) => {
  const collectionName = "Application";
  Application.validatesUniquenessOf("appEui");

  // Application.beforeRemote("login", async (context) => {
  //   logger.publish(4, `${collectionName}`, "beforeLogin:res", context.args);
  //   return Application.login(context.args.credentials, "application")
  //     .then((token) => token)
  //     .catch((err) => {
  //       logger.publish(4, `${collectionName}`, "beforeLogin:err", {
  //         err,
  //       });
  //       return err;
  //     });
  // });

  Application.observe("after save", async (ctx) => {
    logger.publish(3, `${collectionName}`, "afterSave:req", ctx.instance);
    try {
      if (ctx.instance && Application.app) {
        if (ctx.isNewInstance) {
          const token = await Application.app.models.AccessToken.findOrCreate(
            {
              where: {
                appEui: ctx.instance.appEui,
                userId: ctx.instance.id,
              },
            },
            {
              appEui: ctx.instance.appEui,
              userId: ctx.instance.id,
            },
          );
          logger.publish(2, collectionName, "afterSave:res1", token[0]);
          await ctx.instance.updateAttribute("appKey", token[0].id.toString());
        }
        // else check if token is still valid ?
        return null;
      }
      return ctx;
    } catch (error) {
      logger.publish(3, `${collectionName}`, "afterSave:err", error);
      throw error;
    }
  });

  const parseLoraWanMessage = async (packet, params) => {
    try {
      logger.publish(4, `${collectionName}`, "parseLoraWanMessage:req", params);
      if (params.topic && params.payload) {
        // publish to message.protocolName
        return Application.app.publish(params.topic, params.payload.toString());
      }
      const message = JSON.parse(packet.payload);
      if (!message.gateway) return new Error("missing property");

      // find device // sensor protocolName  
      if (message.node) {
        let device = message.node;
        device = await Application.app.models.Device.findOne({
          where: {
            and: [
              {protocolName: device.protocolName},
              {gwId: params.gatewayId},
              {
                or: [{devEui: device.devEui}, {devAddr: device.devAddr}, {id: device.id}],
              },
            ],
          },
        });
        //  console.log("onPublish, device :", device);
        if (!device.id) return new Error("device not found");
        if (params.method === "GET") {
          // publish device
          return device;
        } else if (params.method === "POST" || params.method === "PUT") {
          await device.updateAttributes({frameCounter: device.frameCounter + 1, lastSignal: message.node.lastSignal});
        } else if (params.method === "HEAD") {
          // find an appKey
          await device.updateAttributes({frameCounter: 0, lastSignal: message.node.lastSignal});
        }

        return device;
      } else if (params.sensor) {
        let sensor = params.sensor;
        // find parent device
        const device = await Application.app.models.Device.findOne({
          where: {
            and: [
              {protocolName: sensor.protocolName},
              {gwId: params.gatewayId},
              {
                or: [{devEui: sensor.devEui}, {devAddr: sensor.devAddr}, {id: sensor.deviceId}],
              },
            ],
          },
        });
        if (!device.id) return new Error("device not found");

        const filter = {
          where: {
            and: [
              {
                protocolName: sensor.protocolName,
              },
              {devEui: sensor.devEui},
              {devAddr: sensor.devAddr},
              {appEui: params.appEui},
            ],
          },
        };

        if (params.nativeSensorId && params.nativeType && params.type) {
          filter.where.and.concat([
            {
              nativeSensorId: sensor.nativeSensorId,
            },
            {type: sensor.type},
            {nativeType: sensor.nativeType},
          ]);
        }
        let tempSensor = await Application.app.models.Sensor.findOne(filter);
        if (!tempSensor || tempSensor === null) {
          tempSensor = await device.sensors.create({
            ...sensor,
            accountId: device.accountId,
          });
        }
        if (params.method === "GET") {
          return tempSensor;
        } else if (params.method === "POST" || params.method === "PUT") {
          if (sensor.value && sensor.resource) {
            sensor = await handlers.updateAloesSensors(tempSensor, Number(sensor.resource), sensor.value);
            sensor.frameCounter += 1;
          }
          console.log("UPDATE ALOES SENSOR");
          console.log(" sensor value:", sensor.value);
          console.log("type of sensor value:", typeof sensor.value);

          return tempSensor.updateAttributes(sensor);
        }
      } else if (message.payload) {
        // update gateway ?
        return null;
      }
      return new Error("invalid inputs");
    } catch (error) {
      if (!error) {
        error = new Error("invalid inputs");
      }
      logger.publish(4, `${collectionName}`, "parseLoraWanMessage:err", error);
      return error;
    }
  };

  Application.onPublish = async (pattern, packet) => {
    try {
      logger.publish(4, `${collectionName}`, "onPublish:req", pattern);
      let decoded = null;
      switch (pattern.name) {
        case "loraWan":
          return parseLoraWanMessage(packet, pattern.params);
          break;
        default:
          return new Error("invalid pattern");
      }
    } catch (error) {
      if (!error) {
        error = new Error("invalid pattern");
      }
      logger.publish(4, `${collectionName}`, "onPublish:err", error);
      return error;
    }
  };
};
