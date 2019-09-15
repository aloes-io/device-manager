import initialRolesList from '../initial-data/base-roles.json';
import logger from '../services/logger';
import roleManager from '../services/role-manager';

module.exports = async function createBaseRoles(app) {
  try {
    const roles = await roleManager.setAppRoles(app, initialRolesList);
    logger.publish(4, 'loopback', 'boot:createBaseRoles:res', roles);
    return roles;
  } catch (error) {
    logger.publish(3, 'loopback', 'boot:createBaseRoles:err', error);
    return error;
  }
};
