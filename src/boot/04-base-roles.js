import initialRolesList from '../initial-data/base-roles.json';
import logger from '../services/logger';

//  export default function createBaseRoles(app) {

module.exports = async function createBaseRoles(app) {
  try {
    const Role = app.models.Role;
    let roles = await Role.find({ name: 'admin' });
    logger.publish(4, 'loopback', 'boot:foundBaseRoles:res', roles);
    if (!roles || roles == null) {
      roles = await Role.create(initialRolesList);
    }
    return roles;
  } catch (error) {
    logger.publish(3, 'loopback', 'boot:createBaseRoles:err', error);
    return error;
  }
};
