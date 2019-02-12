import mosca from "mosca";
import redis from "redis";
import {patternDetector} from "aloes-handlers";
import logger from "./logger";

const broker = {};

broker.init = (app, httpServer) => {
  const ascoltatore = {
    type: "redis",
    redis,
    db: Number(process.env.REDIS_MQTT_COLLECTION) || 2,
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    //  return_buffers: true, // to handle binary payloads
  };

  const brokerConfig = {
    port: Number(process.env.MQTT_BROKER_PORT),
    backend: ascoltatore,
    // interfaces: [
    //   {type: "mqtt", port: Number(process.env.MQTT_BROKER_PORT)},
    //   //  { type: "mqtts", port: brokerPortSecure, credentials: { keyPath: privateKeyPath, certPath: certificatePath } },
    // ],
    persistence: {
      factory: mosca.persistence.Redis,
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      //  channel: "moscaSync",
      //  ttl: {subscriptions: 3600 * 1000, packets: 3600 * 1000},
    },
  };

  app.broker = new mosca.Server(brokerConfig);
  app.broker.attachHttpServer(httpServer);
  broker.start(app);
};

broker.start = (app) => {
  const authenticate = (client, username, password, cb) => {
    //  logger.publish(4, "broker", "Authenticate:req", {client: client.id, username, password: password.toString()});
    let auth = false;
    return app.models.AccessToken.findById(password.toString(), (err, token) => {
      if (err || !token) {
        logger.publish(4, "broker", "Authenticate:res", {username, auth});
        cb(null, auth);
        return;
      }
      if (token && token.userId) {
        if (token.devEui && (token.devEui === client.id.toString() || token.userId.toString() === username)) {
          auth = true;
          client.user = username;
          client.devEui = token.devEui;
        } else if (token.appEui && (token.appEui === client.id.toString() || token.appEui === username)) {
          auth = true;
          client.user = username;
          client.appEui = token.appEui;
        } else if (token.userId.toString() === username) {
          auth = true;
          client.user = username;
        }
      }
      logger.publish(4, "broker", "Authenticate:res", {username, auth});
      app.emit("publish", `${token.userId}/Auth/POST`, auth.toString(), false, 1);
      cb(null, auth);
    });
  };

  const authorizePublish = (client, topic, payload, cb) => {
    // todo : if topicParts[1] === "Sensor"
    //  check that the clientId (virtual object, device or account), references that sensor
    const topicParts = topic.split("/");
    let auth = false;
    if (client.user && topicParts[0].startsWith(client.user)) {
      console.log("authorizeSubscribe", client.user);
      logger.publish(4, "broker", "authorizeSubscribe:req", client.user);
      auth = true;
    } else if (client.devEui && topicParts[0].startsWith(client.devEui)) {
      logger.publish(4, "broker", "authorizeSubscribe:req", client.devEui);
      auth = true;
    } else if (client.appEui && topicParts[0].startsWith(client.appEui)) {
      logger.publish(4, "broker", "authorizeSubscribe:req", client.appEui);
      auth = true;
    }
    logger.publish(3, "broker", "authorizePublish:res", {topic, auth});
    cb(null, auth);
  };

  const authorizeSubscribe = (client, topic, cb) => {
    const topicParts = topic.split("/");
    let auth = false;
    if (client.user && topicParts[0].startsWith(client.user)) {
      logger.publish(4, "broker", "authorizeSubscribe:req", client.user);
      auth = true;
    } else if (client.devEui && topicParts[0].startsWith(client.devEui)) {
      logger.publish(4, "broker", "authorizeSubscribe:req", client.devEui);
      auth = true;
    } else if (client.appEui && topicParts[0].startsWith(client.appEui)) {
      logger.publish(4, "broker", "authorizeSubscribe:req", client.appEui);
      auth = true;
    }
    logger.publish(3, "broker", "authorizeSubscribe:res", {topic, auth});
    cb(null, auth);
  };

  function setup() {
    app.broker.authenticate = authenticate;
    app.broker.authorizePublish = authorizePublish;
    app.broker.authorizeSubscribe = authorizeSubscribe;
    logger.publish(2, "broker", "Setup", `Mosca broker ready, up and running @: ${process.env.MQTT_BROKER_URL}`);
  }

  app.broker.on("ready", setup);

  app.broker.on("error", (err) => {
    console.log("broker error: ", err);
  });

  app.broker.on("clientConnected", async (client) => {
    //  if (!Object.prototype.hasOwnProperty.call(client, "id")) return null;
    logger.publish(4, "broker", "clientConnected:req", client.id);
    if (client.user) {
      const device = await app.models.Device.findById(client.user);
      if (device && device !== null) {
        return device.updateAttribute("status", true);
      }
    }
    return null;
  });

  app.broker.on("clientDisconnected", async (client) => {
    logger.publish(4, "broker", "clientDisconnected:req", client.id);
    if (client.user) {
      const device = await app.models.Device.findById(client.user);
      if (device && device !== null) {
        return device.updateAttributes({frameCounter: 0, status: false});
      }
    }
    return null;
  });

  app.on("closed", () => {
    app.broker.close();
  });

  app.on("publish", (topic, payload, retain, qos) => {
    logger.publish(4, "broker", "publish", {topic});
    if (typeof payload !== "string") {
      payload = JSON.stringify(payload);
    }
    app.broker.publish({
      topic,
      payload,
      retain: retain || false,
      qos: qos || 0,
    });
  });

  // let counter = 0;
  // let tempBuffer = [];
  // const parseStream = async (payload, bufferSize) => {
  //   console.log("parseStream:req", payload, bufferSize, counter);
  //   if (payload.length === bufferSize) {
  //     if (counter === 1) {
  //       tempBuffer = Uint8Array.from(payload).buffer;
  //     } else {
  //       tempBuffer = Uint8Array.from([tempBuffer, payload]).buffer;
  //     }
  //   } else if (payload.length <= 4) {
  //     tempBuffer = Uint8Array.from([tempBuffer, payload]).buffer;
  //     //  uploadedFiles = [];
  //     counter = 0;
  //   }
  //   console.log("parseStream:res", tempBuffer);
  //   return tempBuffer;
  // };

  app.broker.on("published", async (packet, client) => {
    try {
      // if (typeof packet.payload === "object" && packet.payload instanceof Buffer) {
      //   counter += 1;
      //   if (!packet.payload.length) {
      //     return false;
      //   }
      //   const result = await parseStream(packet.payload, 1024);
      //   //  parseStream(packet.payload, packet.payload.length);
      //   console.log("RESULT STREAM ", result);
      //   console.log("payload is ArrayBuffer ? ", result instanceof ArrayBuffer);
      // }
      const pattern = await patternDetector(packet);
      if (!pattern || pattern === null) return null;
      logger.publish(2, "broker", "onPublish:res1", pattern);

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
          collectionName = null;
      }
      if (collectionName === null) return null;
      logger.publish(2, "broker", "onPublish:res", collectionName);
      return app.models[collectionName].onPublish(pattern, packet, client);
    } catch (error) {
      logger.publish(2, "broker", "onPublish:err", error);
      return error;
    }
  });

  // app.broker.on("delivered", (packet, client) => {
  //   console.log("Delivered", packet, client.id);
  // });
};

export default broker;
