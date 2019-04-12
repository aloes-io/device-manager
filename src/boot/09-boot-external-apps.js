import externalAppsList from "../initial-data/external-apps.json";
import logger from "../services/logger";

module.exports = function createExternalApps(server) {
  const Application = server.models.Application;

  return Application.find()
    .then((apps) => {
      if (apps.length < externalAppsList.length) {
        return Application.create(externalAppsList).then((res) => {
          logger.publish(4, "loopback", "boot:createExternalApps:res", res);
          return res;
        });
      }
      logger.publish(5, "loopback", "boot:foundExternalApps:res", apps);
      return apps;
    })
    .catch((err) => {
      logger.publish(4, "loopback", "boot:createExternalApps:err", err);
      return err;
    });
};
