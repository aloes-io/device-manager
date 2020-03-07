/* Copyright 2020 Edouard Maleix, read LICENSE */

import logger from './logger';

/**
 * @module RoleManager
 */
const roleManager = {};
const appRolesById = {};

// roleManager.getAppRoles = async app => app.models.Role.find();
roleManager.getAppRoles = () => Object.values(appRolesById);

/**
 * Registers static roles names for the app
 *
 * @param  app
 * @param  {string[]} roles names
 * @return {array} roles
 */
roleManager.setAppRoles = async (app, roles) => {
  logger.publish(4, 'loopback', 'Initialize roles:req', roles);
  const promises = roles.map(async roleName => {
    const obj = { name: roleName };
    const role = await app.models.Role.findOrCreate({ where: obj }, obj);
    return role[0];
  });
  const savedRoles = await Promise.all(promises);
  // cache role name for quick mapping
  savedRoles.forEach(role => {
    appRolesById[role.id] = role.name;
  });
  logger.publish(3, 'loopback', 'Initialize roles:res', savedRoles);
  return savedRoles;
};

/**
 * Returns a promise which resolves with the role ids
 *
 * @param   app
 * @param   userId
 * @return  {Promise<string|number>}
 */
roleManager.getUserRoles = (app, userId) =>
  new Promise((resolve, reject) => {
    app.models.Role.getRoles(
      {
        principalType: app.models.RoleMapping.USER,
        principalId: userId,
      },
      (err, res) => (err ? reject(err) : resolve(res)),
    );
  });

/**
 * Returns a promise which resolves with the role names
 *
 * @param   app
 * @param   userId
 * @return  {Promise<string>}
 */
roleManager.getUserRoleNames = async (app, userId) => {
  try {
    const userRolesIds = await roleManager.getUserRoles(app, userId);
    // eslint-disable-next-line security/detect-object-injection
    return userRolesIds.map(role => appRolesById[role] || null);
  } catch (error) {
    return null;
  }
};

/**
 * Returns a promise which resolves when the role is set
 *
 * @param app
 * @param userId
 * @param {string}  roleName
 * @param {boolean} reset delete previous role
 * @return {Promise}
 */
roleManager.setUserRole = async (app, userId, roleName, reset = false) => {
  if (reset) {
    logger.publish(4, 'loopback', `Removing previous role ${roleName} for user `, userId);
    const roles = await roleManager.getUserRoleNames(app, userId);
    // console.log('Get User roles', roles);
    // the user has same role
    if (roles.includes(roleName)) {
      return;
    }
    const appRoles = await roleManager.getAppRoles();
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
  const role = await app.models.Role.findOne({ where: { name: roleName } });
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
  const role = await app.models.Role.findOne({ where: { name: roleName } });
  if (role && role !== null) {
    await role.principals.destroyAll({ where: { principalId: userId } });
    logger.publish(4, 'loopback', `removeUserRole:res`, userId);
  }
  // return;
};

export default roleManager;
