import virtualObjectsList from "../initial-data/virtual-objects.json";
import logger from "../services/logger";

module.exports = function createSampleVirtualObjects(server) {
  const VirtualObject = server.models.VirtualObject;
  return VirtualObject.find()
    .then((objects) => {
      if (objects.length < virtualObjectsList.length) {
        return VirtualObject.create(virtualObjectsList).then((res) => {
          logger.publish(4, "loopback", "boot:createSampleVirtualObjects:res", res);
          return res;
        });
      }
      logger.publish(4, "loopback", "boot:createSampleVirtualObjects:res", objects);
      return objects;
    })
    .catch((err) => {
      logger.publish(5, "loopback", "boot:createSampleVirtualObjects:err", err);
      return err;
    });
};
