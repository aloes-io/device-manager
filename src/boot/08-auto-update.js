import logger from "../logger";

export default async function autoUpdate(server) {
  const db = server.datasources.db;

  await db.autoupdate()
    .then((res) => {
      logger.publish(2, "loopback", "boot:autoUpdate:res", res);
      return res;
    })
    .catch((err) => {
      logger.publish(2, "loopback", "boot:autoUpdate:err", err);
      return err;
    });
}
