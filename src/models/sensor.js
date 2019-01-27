/* eslint-disable no-param-reassign */
import handlers from "aloes-handlers";
import logger from "../logger.js";

module.exports = function(Sensor) {
  const collectionName = "Sensor";
  let counter = 0;
  let uploadedFiles;

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

  function parseStream(payload, bufferSize) {
    console.log("parseStream.........", payload);

    if (payload.length === bufferSize) {
      //console.log(this.counter);
      if (counter === 1) {
        return (uploadedFiles = new Blob([payload], {
          type: "image/jpeg",
        }));
      } else {
        return (uploadedFiles = new Blob([uploadedFiles, payload], {
          type: "image/jpeg",
        }));
      }
    } else if (payload.length <= 4) {
      //console.log("last", this.counter);
      const blob = new Blob([this.uploadedFiles, payload], {
        type: "image/jpeg",
      });
      uploadedFiles = [];
      counter = 0;
    }
  }

  // Sensor.observe("before save", async (ctx) => {
  //   logger.publish(3, `${collectionName}`, "beforeSave:req", ctx.instance);
  //   logger.publish(3, `${collectionName}`, "beforeSave:req", ctx.data);
  //   try {
  //     let sensor;
  //     if (ctx.data) {
  //       sensor = ctx.data;
  //     } else if (ctx.instance) {
  //       sensor = ctx.instance;
  //     }
  //     // if (sensor.type) {
  //     //   const foundIpsoObject = handlers.ipsoObjects.find((object) => object.value === sensor.type);
  //     //   // todo : insert template based on sensor type
  //     //   //  sensor.template = "AloesSensorSnap/AloesSensorSnap.vue";
  //     //   sensor.template = `${process.env.HTTP_SERVER_URL}/aloes-sensor-snap.vue`;
  //     //   sensor.icons = foundIpsoObject.icons;
  //     //   sensor.colors = foundIpsoObject.colors;
  //     //   sensor.name = foundIpsoObject.name;
  //     //   sensor.frameCounter += 1;
  //     // }
  //     if (sensor.value && sensor.mainResourceId) {
  //       logger.publish(3, `${collectionName}`, "beforeSave:req", typeof sensor.value);
  //       if (typeof sensor.value === "object") {
  //         console.log("beforeSave2.........", sensor.value);
  //         // const payload = Buffer.from(sensor.value);
  //         // console.log("beforeSave3.........", payload);
  //         counter += 1;
  //         if (!sensor.value.length) {
  //           return false;
  //         }
  //         return parseStream(sensor.value, 1024);
  //       } else if (typeof sensor.value === "string") {
  //         sensor.value = {[sensor.mainResourceId]: sensor.value};
  //       }
  //       logger.publish(4, collectionName, "beforeSave:res1", sensor);
  //       return sensor;
  //     }
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
          modelId: ctx.instance.id,
          method: "PUT",
          pattern: "aloesClient",
        });
      }
      if (result && result.topic && result.payload) {
        return Sensor.app.send(result.topic, result.payload);
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
        return Sensor.app.send(result.topic, result.payload);
      }
      return null;
    } catch (error) {
      return error;
    }
  });

  Sensor.beforeRemote("**.find", async (ctx) => {
    // only send results where user is in subscribers list of the room he requested
    logger.publish(4, `${collectionName}`, "beforeFind:req", ctx.methodString);
    logger.publish(4, `${collectionName}`, "beforeFind:req", ctx.data);
    logger.publish(4, `${collectionName}`, "beforeFind:req", ctx.instance);
    // logger.publish(4, `${collectionName}`, "beforeFind:res", template);
    // return template;
    //  return;
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
