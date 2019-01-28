/* eslint-disable no-param-reassign */
import {publish} from "aloes-handlers";
import logger from "../logger.js";

module.exports = function(Measurement) {
  const collectionName = "Measurement";

  async function typeValidator(err) {
    if (this.type.toString().length === 4) {
      return;
    }
    err();
  }
  async function resourceValidator(err) {
    if (this.resource.toString().length === 4) {
      return;
    }
    err();
  }

  Measurement.validatesPresenceOf("sensorId");
  Measurement.validate("type", typeValidator, {
    message: "Wrong sensor type",
  });
  Measurement.validate("resource", resourceValidator, {
    message: "Wrong sensor resource",
  });

  Measurement.observe("after save", async (ctx) => {
    logger.publish(4, `${collectionName}`, "afterSave:req", ctx.instance);
    if (ctx.instance.deviceId && Measurement.app.broker) {
      if (ctx.isNewInstance) {
        const result = await publish({
          userId: ctx.instance.deviceId,
          collectionName,
          data: ctx.instance,
          method: "POST",
          pattern: "aloesClient",
        });
        if (result && result.topic && result.payload) {
          return Measurement.app.publish(result.topic, result.payload);
        }
        return null;
      }
      return null;
    }
    return null;
  });
};
