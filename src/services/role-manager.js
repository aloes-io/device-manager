/* Copyright 2020 Edouard Maleix, read LICENSE */

import logger from './logger';
import utils from '../lib/utils';

/**
 * @module RoleManager
 */
const roleManager = {};
const appRolesById = {};

roleManager.getAppRoles = () => Object.values(appRolesById);

/**
 * Registers static roles names for the app
 *
 * @param app Loopback app
 * @param {string[]} roles names
 * @return {array} roles
 */
roleManager.setAppRoles = async (app, roles) => {
  logger.publish(4, 'loopback', 'Initialize roles:req', roles);
  const savedRoles = await Promise.all(
    roles.map(async roleName => {
      const obj = { name: roleName };
      const role = await app.models.Role.findOrCreate({ where: obj }, obj);
      return role[0];
    }),
  );
  // cache role name for quick mapping
  savedRoles.forEach(role => {
    appRolesById[role.id] = role.name;
  });
  logger.publish(3, 'loopback', 'Initialize roles:res', { appRolesById });
  return savedRoles;
};

/**
 * Returns a promise which resolves with the role names
 *
 * @param   app
 * @param   userId
 * @return  {Promise<string[]>}
 */
roleManager.getUserRoleNames = async (app, userId) => {
  const userRolesIds = await app.models.Role.getRoles({
    principalType: app.models.RoleMapping.USER,
    principalId: userId,
  });
  // console.log('getUserRoleNames:res', userRolesIds);
  // eslint-disable-next-line security/detect-object-injection
  return userRolesIds.map(role => appRolesById[role] || null);
};

/**
 * Returns a promise which resolves when the role is set
 *
 * @param app
 * @param userId
 * @param {string} roleName
 * @param {boolean} [reset] delete previous role
 * @return {Promise}
 */
roleManager.setUserRole = async (app, userId, roleName, reset = false) => {
  if (reset) {
    logger.publish(4, 'loopback', `Removing previous role ${roleName} for user `, userId);
    const roles = await roleManager.getUserRoleNames(app, userId);
    // the user has same role
    if (roles.includes(roleName)) {
      return;
    }
    const appRoles = roleManager.getAppRoles();
    const roleToRevoke = roles.find(role => appRoles.includes(role));
    const setRoleNoReset = async () => roleManager.setUserRole(app, userId, roleName);
    if (!roleToRevoke) {
      await setRoleNoReset();
      return;
    }
    await roleManager.removeUserRole(app, userId, roleToRevoke);
    await setRoleNoReset();
    return;
  }

  logger.publish(4, 'loopback', `Setting role ${roleName} for user `, userId);
  const role = await utils.findOne(app.models.Role, { where: { name: roleName } });
  if (role && role !== null) {
    await role.principals.create({
      principalType: app.models.RoleMapping.USER,
      principalId: userId,
    });
    logger.publish(3, 'loopback', `setUserRole:res`, { roleName, userId });
  }
};

/**
 * Removes the role for the given user
 *
 * @param app
 * @param userId
 * @param {string} roleName
 * @return {Promise}
 */
roleManager.removeUserRole = async (app, userId, roleName) => {
  logger.publish(4, 'loopback', 'removeUserRole:req', `${roleName} from user ${userId}`);
  const role = await utils.findOne(app.models.Role, { where: { name: roleName } });
  if (role && role !== null) {
    await role.principals.destroyAll({ where: { principalId: userId } });
    logger.publish(4, 'loopback', `removeUserRole:res`, userId);
  }
  // return;
};

export default roleManager;
