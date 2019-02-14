import loopback from "loopback";
import boot from "loopback-boot";
import path from "path";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import broker from "./services/broker";
import logger from "./services/logger";

const result = dotenv.config();
if (result.error) {
  throw result.error;
}
// parse .env file, leave this uncommented
console.log("[INIT] Parsing dotenv config : ", result.parsed);
//  const conf = result.parsed;

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
  broker.init(app, httpServer);
});

app.close = function() {
  app.emit("closed");
  httpServer.close();
};

app.publish = (topic, payload) => {
  app.emit("publish", topic, payload);
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
