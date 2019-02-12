import fallback from "express-history-api-fallback";
import path from "path";
import app from "./src/server";

const client = path.resolve(__dirname, "client");

const unless = function(paths, middleware) {
  return function(req, res, next) {
    if (paths.some((p) => req.path.indexOf(p) > -1)) {
      return next();
    }

    return middleware(req, res, next);
  };
};

// enable redirect urls to index
app.use(unless([process.env.REST_API_ROOT, "/explorer", "/components"], fallback("index.html", {root: client})));

app.set("url", process.env.HTTP_SERVER_URL);
app.set("host", process.env.HOST);
app.set("port", Number(process.env.PORT));

// start app
app.on("started", () => {
  // for pm2 graceful start mode
  //  process.send('ready');
  //  console.log(`[SETUP] config : host ${app.get('host')} | port ${app.get('port')}`);
  const baseUrl = app.get("url").replace(/\/$/, "");
  console.log(`[LOOPBACK] setup:Browse ${process.env.APP_NAME} at ${baseUrl}`);
});

// process.on('SIGINT', () => {
//   console.info('SIGINT signal received.');
//   broker.close(() => {
//     console.log('Mosca connection disconnected');
//   });
//   // Stops the server from accepting new connections and finishes existing connections.
//   app.close((err) => {
//     if (err) {
//       console.error(err);
//       process.exit(1);
//     }
//     // broker.close(() => {
//     //   console.log('Mosca connection disconnected');
//     //   process.exit(0);
//     // });
//   });
// });

if (require.main === module) {
  app.start();
}

export default app;
