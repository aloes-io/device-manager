import initialRolesList from "../initial-data/base-roles.json";
import logger from "../services/logger";

//  export default function createBaseRoles(server) {

module.exports = function createBaseRoles(server) {
  const Role = server.models.Role;

  return Role.find({name: "admin"})
    .then((roles) => {
      if (roles.length < 1) {
        return Role.create(initialRolesList).then((res) => {
          logger.publish(4, "loopback", "boot:createBaseRoles:res", res);
          return res;
        });
      }
      logger.publish(4, "loopback", "boot:foundBaseRoles:res", roles);
      return roles;
    })
    .catch((err) => {
      logger.publish(5, "loopback", "boot:createBaseRoles:err", err);
      return err;
    });
}
