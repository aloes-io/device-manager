export default function (server) {
  const router = server.loopback.Router();
  router.get('/status', server.loopback.status());
  server.use(router);
}
