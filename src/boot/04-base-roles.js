/* Copyright 2020 Edouard Maleix, read LICENSE */

import initialRolesList from '../initial-data/base-roles.json';
import roleManager from '../services/role-manager';
// import utils from '../lib/utils';

module.exports = async function createBaseRoles(app) {
  // if (!utils.isMasterProcess(process.env)) return null;
  await roleManager.setAppRoles(app, initialRolesList);
};
