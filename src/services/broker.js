import mosca from "mosca";
import redis from "redis";
import {patternDetector} from "aloes-handlers";
import mqttPattern from "mqtt-pattern";
import externalApps from "../initial-data/external-apps.json";
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
    if (!password || !username) {
      client.user = "guest";
      auth = true;
      cb(null, auth);
      return auth;
    }
    return app.models.AccessToken.findById(password.toString(), (err, token) => {
      if (err || !token) {
        auth = false;
        logger.publish(4, "broker", "Authenticate:res", {username, auth});
        cb(null, auth);
        return auth;
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
      return auth;
    });
  };

  const authorizePublish = (client, topic, payload, cb) => {
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
    logger.publish(4, "broker", "error", err);
  });

  app.broker.on("clientConnected", async (client) => {
    //  if (!Object.prototype.hasOwnProperty.call(client, "id")) return null;
    logger.publish(4, "broker", "clientConnected:req", client.id);
    if (client.user) {
      if (client.devEui) {
        const device = await app.models.Device.findById(client.user);
        if (device && device !== null) {
          return device.updateAttribute("status", true);
        }
      } else if (client.appEui) {
        const externalApp = await app.models.Application.findById(client.user);
        if (externalApp && externalApp !== null) {
          return externalApp.updateAttribute("status", true);
        }
      }
    }
    return null;
  });

  app.broker.on("clientDisconnected", async (client) => {
    logger.publish(4, "broker", "clientDisconnected:req", client.id);
    if (client.user) {
      if (client.devEui) {
        const device = await app.models.Device.findById(client.user);
        if (device && device !== null) {
          return device.updateAttributes({frameCounter: 0, status: false});
        }
      } else if (client.appEui) {
        const externalApp = await app.models.Application.findById(client.user);
        if (externalApp && externalApp !== null) {
          return externalApp.updateAttributes({frameCounter: 0, status: false});
        }
      }
    }
    return null;
  });

  app.on("closed", () => {
    app.broker.close();
  });

  const externalAppDetector = async (packet) => {
    try {
      const pattern = {name: "empty", params: null};
      if (packet.topic.split("/")[0] === "$SYS") return null;
      logger.publish(2, "broker", "externalAppDetector:req", packet.topic);

      await externalApps.forEach((externalApp) => {
        if (externalApp.pattern && mqttPattern.matches(externalApp.pattern, packet.topic)) {
          logger.publish(2, "broker", "externalAppDetector:res", `reading ${externalApp.name} API ...`);
          //  const parsedProtocol = await extractProtocol(app.pattern, packet.topic);
          const parsedProtocol = mqttPattern.exec(externalApp.pattern, packet.topic);
          logger.publish(4, "broker", "externalAppDetector:res", parsedProtocol);
          pattern.name = externalApp.name;
          pattern.params = parsedProtocol;
          return pattern;
        }
        return null;
      });

      pattern.params = "topic doesn't match pattern";
      return pattern;
    } catch (error) {
      logger.publish(2, "broker", "externalAppDetector:err", error);
      return error;
    }
  };

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

  app.broker.on("published", async (packet, client) => {
    try {
      let pattern = await patternDetector(packet);

      if (!pattern || pattern === null || pattern.name === "empty") {
        pattern = await externalAppDetector(packet);
      }
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
          //  collectionName = "Application";
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
