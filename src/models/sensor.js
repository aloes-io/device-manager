/* eslint-disable no-param-reassign */
import handlers from "aloes-handlers";
import logger from "../services/logger";
//  import cache from "../services/cache";
//  const cache = require("../cache.js")();

module.exports = function(Sensor) {
  const collectionName = "Sensor";

  async function typeValidator(err) {
    if (this.type.toString().length === 4) {
      return;
    }
    err();
  }

  async function protocolNameValidator(err) {
    const protocolPatternsKeys = Object.getOwnPropertyNames(handlers.protocolPatterns);
    if (protocolPatternsKeys.find((key) => key === this.protocolName)) return;
    err();
  }

  Sensor.validatesPresenceOf("deviceId");

  Sensor.validate("type", typeValidator, {
    message: "Wrong sensor type",
  });

  Sensor.validate("protocolName", protocolNameValidator, {
    message: "Wrong sensor protocol name",
  });

  // Sensor.observe("access", async (ctx) => {
  //   console.log(`Accessing ${ctx.Model.modelName} matching ${JSON.stringify(ctx.query.where)}`);
  //   //  const cache = require("../cache.js")();
  //   const key = Object.keys(ctx.query.where)[0];
  //   console.log(`Accessing ${ctx.Model.modelName}`, Object.keys(ctx.query.where));

  //   const sensor = cache.findObjs(ctx.Model.modelName, key, ctx.query.where[key]);
  //   if (!sensor) {
  //     console.log(new Error(`${ctx.Model.modelName} is not valid: ${JSON.stringify(ctx.query.where)}`));
  //     //  throw
  //   }
  //   console.log(`Accessing ${ctx.Model.modelName}`, sensor);

  //   return ctx;
  // });

  // Sensor.observe("before save", async (ctx) => {
  //   logger.publish(3, `${collectionName}`, "beforeSave:req", ctx.instance);
  //   logger.publish(3, `${collectionName}`, "beforeSave:req", ctx.data);
  //   try {
  //     let sensor;
  //     if (ctx.data) {
  //       sensor = ctx.data;
  //     } else if (ctx.instance) {
  //       sensor = ctx.instance;
  //     } else return null;
  //     logger.publish(4, collectionName, "beforeSave:res", sensor);

  //     return sensor;
  //   } catch (error) {
  //     logger.publish(3, `${collectionName}`, "beforeSave:err", error);
  //     throw error;
  //   }
  // });

  Sensor.observe("after save", async (ctx) => {
    logger.publish(3, `${collectionName}`, "afterSave:req", ctx.instance);
    //  const updatedOptions = await utils.renderVueTemplate(template, context);
    if (ctx.instance.id && ctx.instance.accountId && Sensor.app.broker) {
      let result;
      // find in redis, virtual objects where sensorIds inq instance.id
      // publish to each virtual objects

      // and publish on device.accountId/Device/device.id/ipso_object_id/sensorId/ipso_resources_id/value
      if (ctx.isNewInstance) {
        result = await handlers.publish({
          userId: ctx.instance.accountId,
          collectionName,
          data: ctx.instance,
          method: "POST",
          pattern: "aloesClient",
        });
      } else {
        result = await handlers.publish({
          userId: ctx.instance.accountId,
          collectionName,
          data: ctx.instance,
          //  modelId: ctx.instance.id,
          method: "PUT",
          pattern: "aloesClient",
        });
      }
      if (result && result.topic && result.payload) {
        return Sensor.app.publish(result.topic, result.payload);
      }
      return null;
    }
    return null;
  });

  Sensor.observe("before delete", async (ctx) => {
    //  console.log('before delete ', ctx);
    try {
      const instance = await ctx.Model.findById(ctx.where.id);
      console.log("before delete ", instance);
      await Sensor.app.models.Measurement.destroyAll({
        sensorId: {like: new RegExp(`.*${ctx.where.id}.*`, "i")},
      });
      const result = await handlers.publish({
        userId: ctx.instance.accountId,
        collectionName,
        data: ctx.instance,
        method: "DELETE",
        pattern: "aloesClient",
      });
      if (result && result.topic && result.payload) {
        return Sensor.app.publish(result.topic, result.payload);
      }
      return null;
    } catch (error) {
      return error;
    }
  });

  Sensor.onPublish = async (pattern, packet) => {
    try {
      // logger.publish(4, `${collectionName}`, "onPublish:req", pattern);
      if (!pattern.value) return null;
      const decodedPayload = await handlers.aloesClientDecoder(packet, pattern.value);

      return decodedPayload;
    } catch (error) {
      return error;
    }
  };
};
