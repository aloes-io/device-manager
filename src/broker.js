import {patternDetector} from "aloes-handlers";
import logger from "./logger";

const broker = {};
broker.initBroker = (app) => {

  const authenticate = (client, username, password, cb) => {
    logger.publish(4, "loopback", "Authenticate:req", {client: client.id, username, password: password.toString()});
    return app.models.AccessToken.findById(password.toString(), (err, token) => {
      logger.publish(4, "loopback", "Authenticate:res1", token);
      if (err) {
        logger.publish(4, "loopback", "Authenticate:res", false);
        cb(null, false);
      }
      //  if (token.userId !== client.id) return null
      if (token.appEui) {
        client.appId = token.appEui;
      }
      client.user = username;
      logger.publish(4, "loopback", "Authenticate:res", true);
      cb(null, true);
    });
  };

  const authorizePublish = (client, topic, payload, cb) => {
    // todo : if topicParts[1] === "Sensor"
    //  check that the clientId (virtual object, device or account), references that sensor
    const topicParts = topic.split("/");
    let auth = false;
    if (topicParts[0].startsWith(client.user)) {
      auth = true;
    } else if (topicParts[0].startsWith(client.id.toString())) {
      auth = true;
    } else if (client.appId && client.appId === client.username) {
      auth = true;
    }
    cb(null, auth);
  };

  const authorizeSubscribe = (client, topic, cb) => {
    // todo : if topicParts[1] === "Sensor"
    //  check that the clientId (virtual object, device or account), references that sensor
    const topicParts = topic.split("/");
    let auth = false;
    if (topicParts[0].startsWith(client.user)) {
      auth = true;
    } else if (topicParts[0].startsWith(client.id.toString())) {
      auth = true;
    } else if (client.appId && client.appId === client.username) {
      auth = true;
    }
    cb(null, auth);
  };

  function setup() {
    app.broker.authenticate = authenticate;
    app.broker.authorizePublish = authorizePublish;
    app.broker.authorizeSubscribe = authorizeSubscribe;
    logger.publish(2, "loopback", "Setup", `Mosca broker ready, up and running @: ${process.env.MQTT_BROKER_URL}`);
  }
  
  app.on("closed", () => {
    app.broker.close();
  });

  app.on("publish", (topic, payload) => {
    if (typeof payload !== "string") {
      payload = JSON.stringify(payload);
    }
    app.broker.publish({
      topic,
      payload,
      retain: false,
      qos: 0,
    });
  });

  app.broker.on("ready", setup);

  app.broker.on("error", (err) => {
    console.log("broker error: ", err);
  });

  app.broker.on("clientConnected", async (client) => {
    //  if (!Object.prototype.hasOwnProperty.call(client, "id")) return null;
    console.log("connected", client.id);
    const device = await app.models.Device.findOne({
      where: {
        devEui: client.id,
      },
    });
    if (device) {
      return device.updateAttribute("status", true);
    }
    return null;
  });

  app.broker.on("clientDisconnected", async (client) => {
    //  if (!Object.prototype.hasOwnProperty.call(client, "id")) return null;
    console.log("disconnected", client.id);
    const device = await app.models.Device.findOne({
      where: {
        devEui: client.id,
      },
    });
    if (device) {
      //  return device.updateAttribute("status", false);
      return device.updateAttributes({frameCounter: 0, status: false});
      // todo update sensor attributes
    }
    return null;
  });

  app.broker.on("published", async (packet, client) => {
    try {
      const pattern = await patternDetector(packet);
      logger.publish(2, "loopback", "onPublish:res1", pattern);
      let collectionName = null;
      // todo : consider platform connection like LoraWan, another collection name ? or just another device type ?
      // proxy mqtt stream  for plugin/handler ?
      switch (pattern.name) {
        case "aloesClient":
          if (pattern.subType === "iot") {
            collectionName = "Device";
          }
          break;
        case "aloesLight":
          collectionName = "Device";
          break;
        case "mySensors":
          collectionName = "Device";
          break;
        case "nodeWebcam":
          collectionName = "Device";
          break;
        case "tracker":
          collectionName = "Device";
          break;
        default:
          console.log(pattern);
      }
      logger.publish(2, "loopback", "onPublish:res", collectionName);
      if (collectionName === null) return null;
      return app.models[collectionName].onPublish(pattern, packet);
      //  return null;
    } catch (error) {
      logger.publish(2, "loopback", "onPublish:err", error);
      return error;
    }
  });



  // app.broker.on("delivered", (packet, client) => {
  //   console.log("Delivered", packet, client.id);
  // });
};

export default broker;
