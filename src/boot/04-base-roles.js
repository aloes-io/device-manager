import initialRolesList from "../initial-data/base-roles.json";
import logger from "../logger";

//  export default function createBaseRoles(server) {

module.exports = function createBaseRoles(server) {
  const Role = server.models.Role;

  return Role.find({name: "admin"})
    .then((roles) => {
      if (roles.length < 1) {
        return Role.create(initialRolesList).then((res) => {
          logger.publish(4, "boot", "createBaseRoles:res", res);
          return res;
        });
      }
      logger.publish(4, "boot", "foundBaseRoles:res", roles);
      return roles;
    })
    .catch((err) => {
      logger.publish(5, "boot", "createBaseRoles:err", err);
      return err;
    });
}
