import logger from "../logger";

export default async function autoUpdate(server) {
  const db = server.datasources.db;

  await db.autoupdate()
    .then((res) => {
      logger.publish(2, "BOOT", "autoUpdate:res", res);
      return res;
    })
    .catch((err) => {
      logger.publish(2, "BOOT", "autoUpdate:err", err);
      return err;
    });
}
