/* Copyright 2019 Edouard Maleix, read LICENSE */

import initialRolesList from '../initial-data/base-roles.json';
import logger from '../services/logger';
import roleManager from '../services/role-manager';
// import utils from '../services/utils';

module.exports = async function createBaseRoles(app) {
  // if (!utils.isMasterProcess(process.env)) return null;
  const roles = await roleManager.setAppRoles(app, initialRolesList);
  logger.publish(4, 'loopback', 'boot:createBaseRoles:res', roles);
};
