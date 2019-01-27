import loopback from "loopback";
import boot from "loopback-boot";
import mosca from "mosca";
import path from "path";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import handlers from "aloes-handlers";
import logger from "./logger";

const result = dotenv.config();
if (result.error) {
  throw result.error;
}
// parse .env file, leave this uncommented
console.log("[INIT] Parsing dotenv config : ", result.parsed);

const app = loopback();
const options = {
  appRootDir: __dirname,
  // File Extensions for jest (strongloop/loopback#3204)
  scriptExtensions: [".js", ".json", ".node", ".ejs"],
};

let httpServer;

app.set("url", process.env.HTTP_SERVER_URL);
app.set("host", process.env.HOST);
app.set("port", Number(process.env.PORT));
app.set("view engine", "ejs");
app.set("json spaces", 2); // format json responses for easier viewing
app.set("views", path.join(__dirname, "views"));

app.use(
  bodyParser.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.start = function() {
  // start the web server
  httpServer = app.listen(() => {
    app.emit("started");
    logger.publish(2, "loopback", "Setup", `${process.env.APP_NAME} / ${process.env.NODE_ENV}`);
    logger.publish(2, "loopback", "Setup", `config : ${app.get("host")}:${app.get("port")}`);

    const baseUrl = app.get("url").replace(/\/$/, "");
    logger.publish(2, "loopback", "Setup", `Express API server listening @: ${baseUrl}/api`);
    if (app.get("loopback-component-explorer")) {
      const explorerPath = app.get("loopback-component-explorer").mountPath;
      logger.publish(4, "loopback", "Setup", `Browse REST API @: ${baseUrl}${explorerPath}`);
    }
  });

  return httpServer;
};

app.on("started", () => {
  //  console.log("config", app.settings);

  const brokerConfig = {
    interfaces: [
      {type: "mqtt", port: Number(process.env.MQTT_BROKER_PORT)},
      //  { type: "mqtts", port: brokerPortSecure, credentials: { keyPath: privateKeyPath, certPath: certificatePath } },
    ],
  };
  app.broker = new mosca.Server(brokerConfig);
  app.broker.attachHttpServer(httpServer);

  const authenticate = (client, username, password, cb) => {
    logger.publish(4, "loopback", "Authenticate:req", {client: client.id, username, password: password.toString()});
    return app.models.AccessToken.findById(password.toString(), (err, token) => {
      logger.publish(4, "loopback", "Authenticate:res1", token);
      if (err) {
        logger.publish(4, "loopback", "Authenticate:res", false);
        cb(null, false);
      }
      client.user = username;
      logger.publish(4, "loopback", "Authenticate:res", true);
      cb(null, true);
    });
  };

  const authorizePublish = (client, topic, payload, cb) => {
    const topicParts = topic.split("/");
    let auth = false;
    if (topicParts[0].startsWith(client.user)) {
      auth = true;
    } else if (topicParts[0].startsWith(client.id.toString())) {
      auth = true;
    }
    cb(null, auth);
  };

  const authorizeSubscribe = (client, topic, cb) => {
    const topicParts = topic.split("/");
    let auth = false;
    if (topicParts[0].startsWith(client.user)) {
      auth = true;
    } else if (topicParts[0].startsWith(client.id.toString())) {
      auth = true;
    }
    cb(null, auth);
  };

  const setup = () => {
    app.broker.authenticate = authenticate;
    app.broker.authorizePublish = authorizePublish;
    app.broker.authorizeSubscribe = authorizeSubscribe;
    logger.publish(2, "loopback", "Setup", `Mosca broker ready, up and running @: ${process.env.MQTT_BROKER_URL}`);
  };

  app.broker.on("ready", setup);

  app.broker.on("error", (err) => {
    console.log(err);
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
    // logger.publish(4, "loopback", "onPublish:req", {
    //   topic: packet.topic,
    //   payload: packet.payload.toString(),
    // });
    try {
      const pattern = await handlers.patternDetector(packet);
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
});

app.close = function() {
  httpServer.close();
  app.broker.close();
};

app.send = (topic, payload) => {
  logger.publish(4, "Loopback", "send", {topic, payload});
  console.log(typeof payload);
  if (typeof payload !== "string") {
    payload = JSON.stringify(payload);
  }
  app.broker.publish({
    topic,
    payload,
    retain: false,
    qos: 0,
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, options, (err) => {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module) {
    app.start();
  }
});

export default app;
